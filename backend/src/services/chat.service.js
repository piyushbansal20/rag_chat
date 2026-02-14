import { ChatSession, Message } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';

class ChatService {
  /**
   * Create a new chat session
   */
  async createSession(userId, companyId, options = {}) {
    const { title, documents, systemPrompt } = options;

    const session = await ChatSession.create({
      user: userId,
      company: companyId,
      title: title || 'New Chat',
      context: {
        documents: documents || [],
        systemPrompt,
      },
    });

    logger.info(`Created chat session ${session._id} for user ${userId}`);

    return session;
  }

  /**
   * List sessions for a user
   */
  async listSessions(userId, companyId, options = {}) {
    const { page = 1, limit = 20, status = 'active' } = options;
    const skip = (page - 1) * limit;

    const query = {
      user: userId,
      company: companyId,
      status,
    };

    const [sessions, total] = await Promise.all([
      ChatSession.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ChatSession.countDocuments(query),
    ]);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId, userId, companyId) {
    const session = await ChatSession.findOne({
      _id: sessionId,
      user: userId,
      company: companyId,
    }).populate('context.documents', 'originalName status');

    if (!session) {
      throw ApiError.notFound('Chat session not found');
    }

    return session;
  }

  /**
   * Get session with messages
   */
  async getSessionWithMessages(sessionId, userId, companyId, options = {}) {
    const { messagesLimit = 50 } = options;

    const session = await this.getSession(sessionId, userId, companyId);

    const messages = await Message.find({ session: sessionId })
      .sort({ createdAt: -1 })
      .limit(messagesLimit)
      .lean();

    // Reverse to get chronological order
    messages.reverse();

    return {
      session,
      messages,
    };
  }

  /**
   * Update session
   */
  async updateSession(sessionId, userId, companyId, updates) {
    const session = await ChatSession.findOne({
      _id: sessionId,
      user: userId,
      company: companyId,
    });

    if (!session) {
      throw ApiError.notFound('Chat session not found');
    }

    if (updates.title !== undefined) {
      session.title = updates.title;
    }

    if (updates.status !== undefined) {
      session.status = updates.status;
    }

    await session.save();

    return session;
  }

  /**
   * Archive session
   */
  async archiveSession(sessionId, userId, companyId) {
    return this.updateSession(sessionId, userId, companyId, { status: 'archived' });
  }

  /**
   * Delete session (soft delete)
   */
  async deleteSession(sessionId, userId, companyId) {
    const session = await ChatSession.findOne({
      _id: sessionId,
      user: userId,
      company: companyId,
    });

    if (!session) {
      throw ApiError.notFound('Chat session not found');
    }

    session.status = 'deleted';
    await session.save();

    // Optionally delete messages
    // await Message.deleteMany({ session: sessionId });

    return { message: 'Session deleted' };
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId, userId, companyId, options = {}) {
    const { page = 1, limit = 50, before } = options;

    // Verify session belongs to user
    const session = await ChatSession.findOne({
      _id: sessionId,
      user: userId,
      company: companyId,
    });

    if (!session) {
      throw ApiError.notFound('Chat session not found');
    }

    const query = { session: sessionId };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Reverse for chronological order
    messages.reverse();

    return {
      messages,
      hasMore: messages.length === limit,
    };
  }

  /**
   * Clear session messages (but keep session)
   */
  async clearMessages(sessionId, userId, companyId) {
    const session = await ChatSession.findOne({
      _id: sessionId,
      user: userId,
      company: companyId,
    });

    if (!session) {
      throw ApiError.notFound('Chat session not found');
    }

    await Message.deleteMany({ session: sessionId });

    session.messageCount = 0;
    session.metadata.totalTokens = 0;
    session.metadata.totalPromptTokens = 0;
    session.metadata.totalCompletionTokens = 0;
    await session.save();

    return { message: 'Messages cleared' };
  }
}

export default new ChatService();
