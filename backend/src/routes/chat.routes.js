import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import {
  authMiddleware,
  tenantMiddleware,
  validate,
  aiLimiter,
} from '../middleware/index.js';
import {
  createSessionSchema,
  updateSessionSchema,
  sendMessageSchema,
  listSessionsSchema,
  getMessagesSchema,
} from '../validators/chat.validator.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Session routes
router.post(
  '/sessions',
  validate(createSessionSchema),
  chatController.createSession
);

router.get(
  '/sessions',
  validate(listSessionsSchema, 'query'),
  chatController.listSessions
);

router.get('/sessions/:id', chatController.getSession);

router.patch(
  '/sessions/:id',
  validate(updateSessionSchema),
  chatController.updateSession
);

router.delete('/sessions/:id', chatController.deleteSession);

// Message routes
router.post(
  '/sessions/:id/messages',
  aiLimiter, // Rate limit AI requests
  validate(sendMessageSchema),
  chatController.sendMessage
);

router.get(
  '/sessions/:id/messages',
  validate(getMessagesSchema, 'query'),
  chatController.getMessages
);

router.delete('/sessions/:id/messages', chatController.clearMessages);

export default router;
