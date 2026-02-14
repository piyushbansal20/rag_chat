import { VoyageAIClient } from 'voyageai';
import config from '../config/index.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

// Voyage AI pricing per million tokens (as of 2025)
const VOYAGE_PRICING = {
  'voyage-3': 0.06,
  'voyage-3-lite': 0.02,
  'voyage-2': 0.10,
  'voyage-large-2': 0.12,
  'voyage-code-2': 0.12,
  default: 0.06,
};

// Voyage AI rerank pricing per million tokens
const VOYAGE_RERANK_PRICING = {
  'rerank-2': 0.05,
  'rerank-2-lite': 0.02,
  default: 0.05,
};

class EmbeddingService {
  constructor() {
    if (!config.voyage.apiKey) {
      logger.warn('Voyage AI API key not configured');
    }
    this.voyage = new VoyageAIClient({
      apiKey: config.voyage.apiKey,
    });
    this.model = config.voyage.embeddingModel;
  }

  /**
   * Calculate cost for Voyage AI usage
   */
  calculateVoyageCost(model, tokens) {
    const pricePerMillion = VOYAGE_PRICING[model] || VOYAGE_PRICING.default;
    return (tokens / 1_000_000) * pricePerMillion;
  }

  /**
   * Generate embeddings for multiple texts
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<{embeddings: number[][], tokensUsed: number}>}
   */
  async generateEmbeddings(texts) {
    if (!config.voyage.apiKey) {
      throw new ApiError(500, 'Voyage AI API key not configured');
    }

    if (texts.length === 0) {
      return { embeddings: [], tokensUsed: 0 };
    }

    logger.info(`Generating embeddings for ${texts.length} texts`);

    try {
      const batchSize = 128; // Voyage AI batch limit
      const allEmbeddings = [];
      let totalTokens = 0;

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await this.voyage.embed({
          input: batch,
          model: this.model,
          inputType: 'document',
        });

        totalTokens += response.usage?.totalTokens || 0;
        allEmbeddings.push(...response.data.map((d) => d.embedding));

        logger.debug(
          `Processed embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`
        );
      }

      // Calculate and log cost
      const cost = this.calculateVoyageCost(this.model, totalTokens);
      logger.info('Voyage AI embedding usage', {
        service: 'voyage',
        model: this.model,
        operation: 'document_embedding',
        textsCount: texts.length,
        embeddingsGenerated: allEmbeddings.length,
        tokens: totalTokens,
        cost: `$${cost.toFixed(6)}`,
        batchesProcessed: Math.ceil(texts.length / batchSize),
      });

      return {
        embeddings: allEmbeddings,
        tokensUsed: totalTokens,
      };
    } catch (error) {
      logger.error('Embedding generation failed:', error);
      if (error.status === 401) {
        throw new ApiError(500, 'Invalid Voyage AI API key');
      }
      if (error.status === 429) {
        throw new ApiError(429, 'Voyage AI rate limit exceeded. Please try again later.');
      }
      throw new ApiError(502, `Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a single query
   * @param {string} query - Query text
   * @returns {Promise<{embedding: number[], tokensUsed: number}>}
   */
  async generateQueryEmbedding(query) {
    if (!config.voyage.apiKey) {
      throw new ApiError(500, 'Voyage AI API key not configured');
    }

    try {
      const response = await this.voyage.embed({
        input: [query],
        model: this.model,
        inputType: 'query',
      });

      const tokensUsed = response.usage?.totalTokens || 0;
      const cost = this.calculateVoyageCost(this.model, tokensUsed);

      logger.info('Voyage AI embedding usage', {
        service: 'voyage',
        model: this.model,
        operation: 'query_embedding',
        tokens: tokensUsed,
        cost: `$${cost.toFixed(6)}`,
      });

      return {
        embedding: response.data[0].embedding,
        tokensUsed,
      };
    } catch (error) {
      logger.error('Query embedding generation failed:', error);
      throw new ApiError(502, `Query embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate cost for Voyage AI reranking
   */
  calculateRerankCost(model, tokens) {
    const pricePerMillion = VOYAGE_RERANK_PRICING[model] || VOYAGE_RERANK_PRICING.default;
    return (tokens / 1_000_000) * pricePerMillion;
  }

  /**
   * Rerank documents based on relevance to a query
   * @param {string} query - The query to rank against
   * @param {Array<{content: string, [key: string]: any}>} documents - Documents with content field
   * @param {Object} options - Reranking options
   * @param {number} options.topK - Number of top results to return (default: all)
   * @param {string} options.model - Rerank model to use (default: rerank-2)
   * @returns {Promise<{results: Array<{index: number, relevanceScore: number, document: any}>, tokensUsed: number}>}
   */
  async rerank(query, documents, options = {}) {
    if (!config.voyage.apiKey) {
      throw new ApiError(500, 'Voyage AI API key not configured');
    }

    if (documents.length === 0) {
      return { results: [], tokensUsed: 0 };
    }

    const { topK = documents.length, model = config.voyage.rerankModel || 'rerank-2' } = options;

    logger.info(`Reranking ${documents.length} documents for query`);

    try {
      const response = await this.voyage.rerank({
        query,
        documents: documents.map((doc) => doc.content),
        model,
        topK,
      });

      const tokensUsed = response.usage?.totalTokens || 0;
      const cost = this.calculateRerankCost(model, tokensUsed);

      // Map results back to original documents with their scores
      const results = response.data.map((item) => ({
        index: item.index,
        relevanceScore: item.relevanceScore,
        document: documents[item.index],
      }));

      logger.info('Voyage AI rerank usage', {
        service: 'voyage',
        model,
        operation: 'rerank',
        documentsCount: documents.length,
        topK,
        tokens: tokensUsed,
        cost: `$${cost.toFixed(6)}`,
      });

      return {
        results,
        tokensUsed,
      };
    } catch (error) {
      logger.error('Reranking failed:', error);
      if (error.status === 401) {
        throw new ApiError(500, 'Invalid Voyage AI API key');
      }
      if (error.status === 429) {
        throw new ApiError(429, 'Voyage AI rate limit exceeded. Please try again later.');
      }
      throw new ApiError(502, `Reranking failed: ${error.message}`);
    }
  }
}

export default new EmbeddingService();
