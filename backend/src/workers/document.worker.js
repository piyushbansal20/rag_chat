import { Worker } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { redisConnection } from '../config/redis.js';
import logger from '../config/logger.js';
import { Document, UsageMetric } from '../models/index.js';
import { JobTypes } from '../queues/document.queue.js';
import textExtractorService from '../services/textExtractor.service.js';
import enhancedPdfExtractorService from '../services/enhancedPdfExtractor.service.js';
import textChunkerService from '../services/textChunker.service.js';
import embeddingService from '../services/embedding.service.js';
import vectorStoreService from '../services/vectorStore.service.js';
import { UPLOAD_DIR } from '../middleware/upload.middleware.js';

/**
 * Process a document: extract text, chunk, embed, store vectors
 */
async function processDocument(job) {
  const { documentId, companyId, userId } = job.data;

  logger.info(`Processing document ${documentId} for company ${companyId}`);

  // Get document from database
  const document = await Document.findById(documentId);
  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  // Update status to processing
  document.status = 'processing';
  document.processing.startedAt = new Date();
  await document.save();

  try {
    // Step 1: Extract text (10%)
    await job.updateProgress(10);

    let text, metadata;
    const isPdf = document.mimeType === 'application/pdf';

    if (isPdf) {
      // Use enhanced PDF extractor for PDFs (better table handling)
      const buffer = await fs.readFile(document.storagePath);
      const result = await enhancedPdfExtractorService.extract(buffer);
      text = result.text;
      metadata = result.metadata;
      logger.info(`Enhanced PDF extraction: type=${metadata.documentType}, tables=${metadata.hasDetectedTables}`);
    } else {
      // Use standard extractor for other file types
      const result = await textExtractorService.extract(
        document.storagePath,
        document.mimeType
      );
      text = result.text;
      metadata = result.metadata;
    }

    logger.info(`Extracted ${metadata.wordCount} words from document ${documentId}`);

    // Step 2: Chunk text (30%)
    await job.updateProgress(30);

    // Determine chunking strategy and size based on document type
    let strategy, maxTokens, overlapTokens;

    if (isPdf && metadata.documentType) {
      // Use recommendations from enhanced PDF extractor
      strategy = metadata.recommendedChunkingStrategy || 'table-aware';
      maxTokens = metadata.recommendedChunkSize || 1000;
      overlapTokens = Math.round(maxTokens * 0.075); // 7.5% overlap

      logger.info(`Using ${strategy} strategy with ${maxTokens} max tokens for ${metadata.documentType} document`);
    } else {
      // Auto-detect for non-PDF files
      const detectedStrategy = textChunkerService.detectContentType(text);
      const isMarkdown = metadata.isMarkdown || document.mimeType === 'text/markdown' || document.mimeType === 'text/x-markdown';
      strategy = isMarkdown ? 'markdown' : detectedStrategy;
      maxTokens = 500;
      overlapTokens = 50;
    }

    const chunks = textChunkerService.chunk(text, { strategy, maxTokens, overlapTokens });
    const chunkStats = textChunkerService.getChunkStats(chunks);

    logger.info(`Created ${chunkStats.count} chunks using '${strategy}' strategy for document ${documentId}`);

    // Step 3: Generate embeddings (60%)
    await job.updateProgress(50);
    const chunkTexts = chunks.map((c) => c.content);
    const { embeddings, tokensUsed } = await embeddingService.generateEmbeddings(chunkTexts);

    await job.updateProgress(70);

    // Step 4: Store vectors in ChromaDB (80%)
    const vectorIds = chunks.map((c) => `${documentId}_chunk_${c.index}`);
    const metadatas = chunks.map((c) => ({
      document_id: documentId.toString(),
      company_id: companyId.toString(),
      chunk_index: c.index,
      start_char: c.startChar,
      end_char: c.endChar,
      tokens: c.tokens,
      source_filename: document.originalName,
    }));

    await vectorStoreService.addDocuments(companyId, {
      ids: vectorIds,
      embeddings,
      documents: chunkTexts,
      metadatas,
    });

    await job.updateProgress(90);

    // Step 5: Move file to permanent storage
    const permanentPath = path.join(
      UPLOAD_DIR,
      companyId.toString(),
      `${documentId}${path.extname(document.originalName)}`
    );

    // Ensure directory exists
    await fs.mkdir(path.dirname(permanentPath), { recursive: true });

    // Move file
    await fs.rename(document.storagePath, permanentPath);

    // Step 6: Update document status
    document.status = 'ready';
    document.storagePath = permanentPath;
    document.vectorIds = vectorIds;
    document.processing.completedAt = new Date();
    document.processing.pageCount = metadata.pageCount;
    document.processing.wordCount = metadata.wordCount;
    document.processing.chunkCount = chunks.length;
    document.processing.totalTokens = chunkStats.totalTokens;
    document.processing.extractionMethod = metadata.extractionMethod;
    document.processing.chunkingStrategy = strategy;
    document.processing.documentType = metadata.documentType || 'general';
    document.processing.hasDetectedTables = metadata.hasDetectedTables || false;
    await document.save();

    // Track usage
    await UsageMetric.incrementUsage(companyId, userId, {
      embeddingTokens: tokensUsed,
      documentsUploaded: 1,
    });

    await job.updateProgress(100);

    logger.info(`Document ${documentId} processed successfully`);

    return {
      documentId,
      chunks: chunks.length,
      tokensUsed,
      status: 'ready',
    };
  } catch (error) {
    logger.error(`Document processing failed for ${documentId}:`, error);

    // Update document status to failed
    document.status = 'failed';
    document.processing.error = error.message;
    await document.save();

    throw error;
  }
}

/**
 * Delete document vectors
 */
async function deleteDocument(job) {
  const { documentId, companyId, storagePath } = job.data;

  logger.info(`Deleting document ${documentId}`);

  try {
    // Delete vectors from ChromaDB
    await vectorStoreService.deleteByDocumentId(companyId, documentId);

    // Delete file from storage
    if (storagePath) {
      try {
        await fs.unlink(storagePath);
      } catch (error) {
        logger.warn(`Failed to delete file ${storagePath}:`, error.message);
      }
    }

    // Update document status
    await Document.findByIdAndUpdate(documentId, { status: 'deleted' });

    logger.info(`Document ${documentId} deleted successfully`);

    return { documentId, deleted: true };
  } catch (error) {
    logger.error(`Document deletion failed for ${documentId}:`, error);
    throw error;
  }
}

// Create worker
const documentWorker = new Worker(
  'document-processing',
  async (job) => {
    logger.info(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case JobTypes.PROCESS_DOCUMENT:
        return processDocument(job);

      case JobTypes.DELETE_DOCUMENT:
        return deleteDocument(job);

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process 3 documents at a time
    limiter: {
      max: 10,
      duration: 60000, // Max 10 jobs per minute
    },
  }
);

// Event handlers
documentWorker.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed`, { result });
});

documentWorker.on('failed', (job, error) => {
  logger.error(`Job ${job?.id} failed`, {
    error: error.message,
    stack: error.stack,
  });
});

documentWorker.on('error', (error) => {
  logger.error('Worker error', { error: error.message });
});

export default documentWorker;
