import { ChromaClient } from 'chromadb';
import config from '../config/index.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

class VectorStoreService {
  constructor() {
    this.client = null;
    this.collections = new Map(); // Cache collections
  }

  /**
   * Initialize ChromaDB client
   */
  async initialize() {
    if (this.client) return;

    try {
      this.client = new ChromaClient({
        path: config.chroma.host,
      });
      logger.info(`ChromaDB client connected to ${config.chroma.host}`);
    } catch (error) {
      logger.error('Failed to connect to ChromaDB:', error);
      throw new ApiError(500, 'Vector store connection failed');
    }
  }

  /**
   * Get or create a collection for a company
   * Each company gets its own isolated collection
   */
  async getCollection(companyId) {
    await this.initialize();

    const collectionName = `company_${companyId}`;

    // Check cache first
    if (this.collections.has(collectionName)) {
      return this.collections.get(collectionName);
    }

    try {
      const collection = await this.client.getOrCreateCollection({
        name: collectionName,
        metadata: {
          'hnsw:space': 'cosine',
          company_id: companyId.toString(),
        },
      });

      this.collections.set(collectionName, collection);
      logger.info(`Collection ${collectionName} ready`);

      return collection;
    } catch (error) {
      logger.error(`Failed to get collection for company ${companyId}:`, error);
      throw new ApiError(500, 'Failed to access vector store');
    }
  }

  /**
   * Add documents to vector store
   * @param {string} companyId - Company ID
   * @param {Object} data - { ids, embeddings, documents, metadatas }
   */
  async addDocuments(companyId, { ids, embeddings, documents, metadatas }) {
    const collection = await this.getCollection(companyId);

    try {
      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas,
      });

      logger.info(`Added ${ids.length} vectors to company ${companyId}`);
      return ids;
    } catch (error) {
      logger.error('Failed to add documents to vector store:', error);
      throw new ApiError(500, 'Failed to store vectors');
    }
  }

  /**
   * Query similar documents
   * @param {string} companyId - Company ID
   * @param {number[]} queryEmbedding - Query embedding vector
   * @param {Object} options - { nResults, where, whereDocument }
   */
  async query(companyId, queryEmbedding, options = {}) {
    const collection = await this.getCollection(companyId);

    const { nResults = 5, where, whereDocument } = options;

    try {
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
        where,
        whereDocument,
        include: ['documents', 'metadatas', 'distances'],
      });

      // Transform results to a more usable format
      const documents = [];
      if (results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          documents.push({
            id: results.ids[0][i],
            content: results.documents?.[0]?.[i] || '',
            metadata: results.metadatas?.[0]?.[i] || {},
            distance: results.distances?.[0]?.[i] || 0,
            // Convert distance to similarity score (cosine)
            score: 1 - (results.distances?.[0]?.[i] || 0),
          });
        }
      }

      logger.debug(`Query returned ${documents.length} results for company ${companyId}`);
      return documents;
    } catch (error) {
      logger.error('Vector search failed:', error);
      throw new ApiError(500, 'Vector search failed');
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteByIds(companyId, ids) {
    const collection = await this.getCollection(companyId);

    try {
      await collection.delete({ ids });
      logger.info(`Deleted ${ids.length} vectors from company ${companyId}`);
    } catch (error) {
      logger.error('Failed to delete vectors:', error);
      throw new ApiError(500, 'Failed to delete vectors');
    }
  }

  /**
   * Delete all vectors for a document
   */
  async deleteByDocumentId(companyId, documentId) {
    const collection = await this.getCollection(companyId);

    try {
      await collection.delete({
        where: { document_id: documentId.toString() },
      });
      logger.info(`Deleted vectors for document ${documentId}`);
    } catch (error) {
      logger.error('Failed to delete document vectors:', error);
      throw new ApiError(500, 'Failed to delete document vectors');
    }
  }

  /**
   * Get collection stats
   */
  async getStats(companyId) {
    const collection = await this.getCollection(companyId);

    try {
      const count = await collection.count();
      return { vectorCount: count };
    } catch (error) {
      logger.error('Failed to get collection stats:', error);
      return { vectorCount: 0 };
    }
  }

  /**
   * Delete entire company collection (for account deletion)
   */
  async deleteCollection(companyId) {
    await this.initialize();
    const collectionName = `company_${companyId}`;

    try {
      await this.client.deleteCollection({ name: collectionName });
      this.collections.delete(collectionName);
      logger.info(`Deleted collection ${collectionName}`);
    } catch (error) {
      logger.error('Failed to delete collection:', error);
      // Don't throw - collection might not exist
    }
  }
}

export default new VectorStoreService();
