import Anthropic from '@anthropic-ai/sdk';
import config from '../config/index.js';
import logger from '../config/logger.js';
import embeddingService from './embedding.service.js';
import vectorStoreService from './vectorStore.service.js';
import { Document, Message, ChatSession, UsageMetric } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

// Claude pricing per million tokens (as of 2025)
const CLAUDE_PRICING = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  default: { input: 3.0, output: 15.0 },
};

class RAGService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
    this.model = config.anthropic.chatModel;
  }

  /**
   * Calculate cost for Claude API usage
   */
  calculateClaudeCost(model, inputTokens, outputTokens) {
    const pricing = CLAUDE_PRICING[model] || CLAUDE_PRICING.default;
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * System prompt for RAG
   */
  getSystemPrompt() {
    return `You are a helpful AI assistant for a company's internal knowledge base. Your role is to answer questions accurately based on the provided context from company documents.

GUIDELINES:
1. Answer questions using ONLY the information provided in the context below
2. If the context doesn't contain enough information to answer, say "I don't have enough information in the knowledge base to answer this question. You may want to upload more relevant documents."
3. Be concise but thorough in your answers
4. If you reference specific information, mention the source document
5. Do not make up information or hallucinate facts
6. If the question is ambiguous, ask for clarification
7. Format your response using markdown for better readability when appropriate
8. Be professional and helpful

CHART GENERATION:
When the user asks for a chart, graph, or visualization of data (e.g., "show me a chart", "create a graph", "visualize", "plot"):
1. Extract the EXACT numerical data from the context - do not estimate or round unless necessary
2. Return a chart configuration wrapped in <<<chart>>> tags BEFORE your text explanation
3. If user asks for MULTIPLE charts, create SEPARATE <<<chart>>>...<<<chart>>> blocks for each
4. Use this exact JSON format:

<<<chart>>>
{
  "type": "bar|line|pie|doughnut",
  "title": "Descriptive Chart Title",
  "format": "currency|number|percent|compact",
  "labels": ["Label1", "Label2", ...],
  "datasets": [
    {
      "label": "Dataset Name",
      "data": [value1, value2, ...]
    }
  ]
}
<<<chart>>>

CHART TYPE GUIDELINES:
- "bar": Comparing categories (quarterly revenue, department expenses, year-over-year)
- "line": Trends over time (monthly growth, performance trajectory, historical data)
- "pie": Proportions of a whole (market share, budget allocation, distribution)
- "doughnut": Same as pie but with center space (revenue breakdown, category split)

FORMAT OPTIONS:
- "currency": For monetary values (shows $1.2M, $500K, etc.)
- "number": For counts and quantities
- "percent": For percentage values
- "compact": For large numbers (shows 1.2M, 500K, etc.)

DATA ACCURACY RULES:
- Use EXACT numbers from the documents, not approximations
- Include ALL relevant data points found in the context
- Preserve the original units (thousands, millions, etc.)
- If data is in thousands (e.g., "USD '000"), multiply by 1000 for actual values OR note it in the title
- Sort data logically (chronologically for time series, by value for comparisons)

MULTIPLE CHART EXAMPLE:
If user asks "show me a line chart and pie chart of revenue":
<<<chart>>>
{"type":"line","title":"Revenue Trend","format":"currency","labels":["Q1","Q2","Q3","Q4"],"datasets":[{"label":"Revenue","data":[1000000,1200000,1500000,1800000]}]}
<<<chart>>>

<<<chart>>>
{"type":"pie","title":"Revenue by Segment","format":"currency","labels":["Product A","Product B","Product C"],"datasets":[{"label":"Revenue","data":[2500000,1800000,1200000]}]}
<<<chart>>>

After ALL chart blocks, provide a brief analysis explaining the key insights from the data.
If the context lacks sufficient numerical data, explain what's missing and suggest what documents might help.`;
  }

  /**
   * Retrieve relevant context from vector store
   */
  async retrieveContext(query, companyId, options = {}) {
    const { maxResults = 5, threshold = 0.1 } = options;  // Lowered threshold for better recall

    // Generate query embedding
    const { embedding, tokensUsed } = await embeddingService.generateQueryEmbedding(query);

    // Fetch more results initially if reranking is enabled (reranker will filter to topK)
    const fetchCount = config.voyage.enableReranking ? Math.max(maxResults * 3, 15) : maxResults;

    // Search vector store
    const results = await vectorStoreService.query(companyId, embedding, {
      nResults: fetchCount,
    });

    // Filter by threshold and enrich with document info
    let relevantChunks = [];
    const documentIds = new Set();

    // Debug: log all results before filtering
    logger.info(`Vector search returned ${results.length} results with scores: ${results.map(r => r.score.toFixed(3)).join(', ')}`);

    for (const result of results) {
      if (result.score >= threshold) {
        documentIds.add(result.metadata.document_id);
        relevantChunks.push({
          content: result.content,
          documentId: result.metadata.document_id,
          documentName: result.metadata.source_filename,
          chunkIndex: result.metadata.chunk_index,
          score: result.score,
        });
      }
    }

    let rerankTokens = 0;

    // Apply reranking if enabled and we have results
    if (config.voyage.enableReranking && relevantChunks.length > 1) {
      logger.info(`Reranking ${relevantChunks.length} chunks with Voyage AI`);

      const { results: rerankedResults, tokensUsed: rerankerTokens } = await embeddingService.rerank(
        query,
        relevantChunks,
        { topK: maxResults }
      );

      rerankTokens = rerankerTokens;

      // Replace chunks with reranked results
      relevantChunks = rerankedResults.map((r) => ({
        ...r.document,
        score: r.relevanceScore, // Use reranker score instead of vector similarity
      }));

      logger.info(`Reranking complete. Top scores: ${relevantChunks.map(c => c.score.toFixed(3)).join(', ')}`);
    } else {
      // Limit to maxResults if not reranking
      relevantChunks = relevantChunks.slice(0, maxResults);
    }

    logger.info(
      `Retrieved ${relevantChunks.length} relevant chunks from ${documentIds.size} documents`
    );

    return {
      chunks: relevantChunks,
      embeddingTokens: tokensUsed,
      rerankTokens,
    };
  }

  /**
   * Build context string from chunks
   */
  buildContext(chunks) {
    if (chunks.length === 0) {
      return '';
    }

    return chunks
      .map((chunk, index) => {
        return `[Source ${index + 1}: ${chunk.documentName}]\n${chunk.content}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Build messages array for chat completion (Claude format)
   */
  buildMessages(query, context, conversationHistory = []) {
    const messages = [];

    // Add conversation history (last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Build user message with context
    let userMessage = query;
    if (context) {
      userMessage = `CONTEXT FROM KNOWLEDGE BASE:
---
${context}
---

USER QUESTION:
${query}

Please answer based on the context provided above.`;
    }

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Query with streaming response
   */
  async queryWithStreaming(params, res) {
    const { query, sessionId, companyId, userId } = params;
    const startTime = Date.now();

    if (!config.anthropic.apiKey) {
      throw ApiError.internal('Anthropic API key not configured');
    }

    // Get session and history
    const session = await ChatSession.findOne({
      _id: sessionId,
      company: companyId,
      user: userId,
    });

    if (!session) {
      throw ApiError.notFound('Chat session not found');
    }

    // Get conversation history
    const history = await Message.find({ session: sessionId })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    // Retrieve context (with optional reranking)
    const { chunks, embeddingTokens, rerankTokens = 0 } = await this.retrieveContext(query, companyId);
    const context = this.buildContext(chunks);

    // Build messages
    const messages = this.buildMessages(query, context, history);

    // Save user message
    const userMessage = await Message.create({
      session: sessionId,
      company: companyId,
      role: 'user',
      content: query,
    });

    // Update session title if first message
    if (session.messageCount === 0) {
      await session.updateTitleFromMessage(query);
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let fullResponse = '';
    let completionTokens = 0;
    let promptTokens = 0;

    try {
      // Send start event
      this.sendSSEEvent(res, 'start', { model: this.model, sessionId });

      // Stream from Claude
      const stream = await this.anthropic.messages.stream({
        model: this.model,
        system: this.getSystemPrompt(),
        messages,
        max_tokens: 1000,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const content = event.delta.text;
          if (content) {
            fullResponse += content;
            this.sendSSEEvent(res, 'chunk', { content });
          }
        }

        // Capture usage from message_delta event
        if (event.type === 'message_delta' && event.usage) {
          completionTokens = event.usage.output_tokens;
        }

        // Capture input tokens from message_start
        if (event.type === 'message_start' && event.message?.usage) {
          promptTokens = event.message.usage.input_tokens;
        }
      }

      // Estimate tokens if not provided
      if (!completionTokens) {
        completionTokens = Math.ceil(fullResponse.length / 4);
      }
      if (!promptTokens) {
        promptTokens = Math.ceil(JSON.stringify(messages).length / 4);
      }

      const latencyMs = Date.now() - startTime;

      // Build sources for response
      const sources = chunks.slice(0, 3).map((chunk) => ({
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        chunkIndex: chunk.chunkIndex,
        relevanceScore: chunk.score,
        excerpt: chunk.content.substring(0, 200) + '...',
      }));

      // Save assistant message
      const assistantMessage = await Message.create({
        session: sessionId,
        company: companyId,
        role: 'assistant',
        content: fullResponse,
        sources,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
        },
        metadata: {
          model: this.model,
          latencyMs,
        },
      });

      // Update session
      session.messageCount += 2;
      session.lastMessageAt = new Date();
      session.metadata.model = this.model;
      session.metadata.totalTokens += promptTokens + completionTokens;
      session.metadata.totalPromptTokens += promptTokens;
      session.metadata.totalCompletionTokens += completionTokens;
      await session.save();

      // Track usage
      await UsageMetric.incrementUsage(companyId, userId, {
        chatMessages: 2,
        promptTokens,
        completionTokens,
        embeddingTokens: embeddingTokens + rerankTokens,
        apiCalls: 1,
      });

      // Calculate and log cost
      const cost = this.calculateClaudeCost(this.model, promptTokens, completionTokens);
      logger.info('Claude API usage', {
        service: 'claude',
        model: this.model,
        sessionId,
        tokens: {
          input: promptTokens,
          output: completionTokens,
          total: promptTokens + completionTokens,
        },
        cost: {
          input: `$${cost.inputCost.toFixed(6)}`,
          output: `$${cost.outputCost.toFixed(6)}`,
          total: `$${cost.totalCost.toFixed(6)}`,
        },
        latencyMs,
        chunksUsed: chunks.length,
      });

      // Send completion event
      this.sendSSEEvent(res, 'done', {
        messageId: assistantMessage._id,
        sources,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
        },
        latencyMs,
      });
    } catch (error) {
      logger.error('RAG streaming failed:', error);
      this.sendSSEEvent(res, 'error', {
        message: error.message || 'An error occurred while generating response',
      });
    } finally {
      res.end();
    }
  }

  /**
   * Send SSE event
   */
  sendSSEEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Non-streaming query (for testing)
   */
  async query(params) {
    const { query, sessionId, companyId } = params;

    // Retrieve context (with optional reranking)
    const { chunks, embeddingTokens, rerankTokens = 0 } = await this.retrieveContext(query, companyId);
    const context = this.buildContext(chunks);

    // Get history
    const history = await Message.find({ session: sessionId })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    // Build messages
    const messages = this.buildMessages(query, context, history);

    // Call Claude
    const startTime = Date.now();
    const response = await this.anthropic.messages.create({
      model: this.model,
      system: this.getSystemPrompt(),
      messages,
      max_tokens: 1000,
    });
    const latencyMs = Date.now() - startTime;

    const content = response.content[0].text;
    const usage = response.usage;

    // Calculate and log cost
    const cost = this.calculateClaudeCost(this.model, usage.input_tokens, usage.output_tokens);
    logger.info('Claude API usage', {
      service: 'claude',
      model: this.model,
      sessionId,
      tokens: {
        input: usage.input_tokens,
        output: usage.output_tokens,
        total: usage.input_tokens + usage.output_tokens,
      },
      cost: {
        input: `$${cost.inputCost.toFixed(6)}`,
        output: `$${cost.outputCost.toFixed(6)}`,
        total: `$${cost.totalCost.toFixed(6)}`,
      },
      latencyMs,
      chunksUsed: chunks.length,
    });

    return {
      content,
      sources: chunks.slice(0, 3),
      tokens: {
        prompt: usage.input_tokens,
        completion: usage.output_tokens,
        total: usage.input_tokens + usage.output_tokens,
        embedding: embeddingTokens,
        rerank: rerankTokens,
      },
    };
  }
}

export default new RAGService();
