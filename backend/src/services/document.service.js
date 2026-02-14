import fs from 'fs/promises';
import path from 'path';
import { Document, Company } from '../models/index.js';
import { addDocumentJob, JobTypes, getJobStatus } from '../queues/index.js';
import vectorStoreService from './vectorStore.service.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import { UPLOAD_DIR } from '../middleware/upload.middleware.js';

class DocumentService {
  /**
   * Upload and queue document for processing
   */
  async uploadDocument(file, userId, companyId) {
    // Check company storage quota
    const company = await Company.findById(companyId);
    const currentUsage = await Document.getStorageUsage(companyId);
    const maxBytes = company.settings.maxStorageMB * 1024 * 1024;

    if (currentUsage.totalSize + file.size > maxBytes) {
      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});
      throw ApiError.forbidden('Storage quota exceeded');
    }

    // Check document count limit
    if (currentUsage.count >= company.settings.maxDocuments) {
      await fs.unlink(file.path).catch(() => {});
      throw ApiError.forbidden('Document limit reached');
    }

    // Create document record
    const document = await Document.create({
      company: companyId,
      uploadedBy: userId,
      originalName: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: 'pending',
    });

    // Queue for processing
    const job = await addDocumentJob(JobTypes.PROCESS_DOCUMENT, {
      documentId: document._id.toString(),
      companyId: companyId.toString(),
      userId: userId.toString(),
    });

    logger.info(`Document ${document._id} uploaded and queued as job ${job.id}`);

    return {
      document: document.toJSON(),
      jobId: job.id,
    };
  }

  /**
   * Upload multiple documents
   */
  async uploadDocuments(files, userId, companyId) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.uploadDocument(file, userId, companyId);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({
          success: false,
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId, companyId) {
    const document = await Document.findOne({
      _id: documentId,
      company: companyId,
      status: { $ne: 'deleted' },
    }).populate('uploadedBy', 'firstName lastName email');

    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    return document;
  }

  /**
   * List documents for a company
   */
  async listDocuments(companyId, options = {}) {
    const { page = 1, limit = 20, status, search } = options;
    const skip = (page - 1) * limit;

    const query = {
      company: companyId,
      status: { $ne: 'deleted' },
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { 'metadata.title': { $regex: search, $options: 'i' } },
        { 'metadata.tags': { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('uploadedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Document.countDocuments(query),
    ]);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId, companyId, updates) {
    const allowedUpdates = ['metadata.title', 'metadata.description', 'metadata.tags', 'metadata.category'];

    const document = await Document.findOne({
      _id: documentId,
      company: companyId,
      status: { $ne: 'deleted' },
    });

    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    // Apply updates
    if (updates.title !== undefined) document.metadata.title = updates.title;
    if (updates.description !== undefined) document.metadata.description = updates.description;
    if (updates.tags !== undefined) document.metadata.tags = updates.tags;
    if (updates.category !== undefined) document.metadata.category = updates.category;

    await document.save();

    return document;
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId, companyId) {
    const document = await Document.findOne({
      _id: documentId,
      company: companyId,
      status: { $ne: 'deleted' },
    });

    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    // Queue deletion job (handles vector cleanup and file deletion)
    await addDocumentJob(JobTypes.DELETE_DOCUMENT, {
      documentId: document._id.toString(),
      companyId: companyId.toString(),
      storagePath: document.storagePath,
    });

    return { message: 'Document deletion queued' };
  }

  /**
   * Get document processing status
   */
  async getProcessingStatus(documentId, companyId) {
    const document = await Document.findOne({
      _id: documentId,
      company: companyId,
    }).select('status processing');

    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    return {
      status: document.status,
      processing: document.processing,
    };
  }

  /**
   * Get document download stream
   */
  async getDocumentPath(documentId, companyId) {
    const document = await Document.findOne({
      _id: documentId,
      company: companyId,
      status: 'ready',
    });

    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    // Verify file exists
    try {
      await fs.access(document.storagePath);
    } catch {
      throw ApiError.notFound('Document file not found');
    }

    return {
      path: document.storagePath,
      filename: document.originalName,
      mimeType: document.mimeType,
    };
  }
}

export default new DocumentService();
