import chatService from '../services/chat.service.js';
import ragService from '../services/rag.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create new chat session
 * POST /api/v1/chat/sessions
 */
export const createSession = asyncHandler(async (req, res) => {
  const { title, documents, systemPrompt } = req.body;

  const session = await chatService.createSession(req.userId, req.companyId, {
    title,
    documents,
    systemPrompt,
  });

  res.status(201).json(new ApiResponse(201, session, 'Session created'));
});

/**
 * List chat sessions
 * GET /api/v1/chat/sessions
 */
export const listSessions = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;

  const result = await chatService.listSessions(req.userId, req.companyId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status,
  });

  res.json(new ApiResponse(200, result, 'Sessions retrieved'));
});

/**
 * Get session with messages
 * GET /api/v1/chat/sessions/:id
 */
export const getSession = asyncHandler(async (req, res) => {
  const result = await chatService.getSessionWithMessages(
    req.params.id,
    req.userId,
    req.companyId
  );

  res.json(new ApiResponse(200, result, 'Session retrieved'));
});

/**
 * Update session
 * PATCH /api/v1/chat/sessions/:id
 */
export const updateSession = asyncHandler(async (req, res) => {
  const { title, status } = req.body;

  const session = await chatService.updateSession(
    req.params.id,
    req.userId,
    req.companyId,
    { title, status }
  );

  res.json(new ApiResponse(200, session, 'Session updated'));
});

/**
 * Delete session
 * DELETE /api/v1/chat/sessions/:id
 */
export const deleteSession = asyncHandler(async (req, res) => {
  const result = await chatService.deleteSession(
    req.params.id,
    req.userId,
    req.companyId
  );

  res.json(new ApiResponse(200, result, 'Session deleted'));
});

/**
 * Send message and get AI response (SSE streaming)
 * POST /api/v1/chat/sessions/:id/messages
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || typeof content !== 'string' || !content.trim()) {
    throw ApiError.badRequest('Message content is required');
  }

  // Stream response via SSE
  await ragService.queryWithStreaming(
    {
      query: content.trim(),
      sessionId: req.params.id,
      companyId: req.companyId,
      userId: req.userId,
    },
    res
  );
});

/**
 * Get session messages (paginated)
 * GET /api/v1/chat/sessions/:id/messages
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { limit, before } = req.query;

  const result = await chatService.getMessages(
    req.params.id,
    req.userId,
    req.companyId,
    {
      limit: parseInt(limit) || 50,
      before,
    }
  );

  res.json(new ApiResponse(200, result, 'Messages retrieved'));
});

/**
 * Clear session messages
 * DELETE /api/v1/chat/sessions/:id/messages
 */
export const clearMessages = asyncHandler(async (req, res) => {
  const result = await chatService.clearMessages(
    req.params.id,
    req.userId,
    req.companyId
  );

  res.json(new ApiResponse(200, result, 'Messages cleared'));
});
