import Joi from 'joi';

export const createSessionSchema = Joi.object({
  title: Joi.string().trim().max(200).optional(),
  documents: Joi.array().items(Joi.string().hex().length(24)).max(20).optional(),
  systemPrompt: Joi.string().trim().max(2000).optional(),
});

export const updateSessionSchema = Joi.object({
  title: Joi.string().trim().max(200).optional(),
  status: Joi.string().valid('active', 'archived').optional(),
});

export const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(10000).required(),
});

export const listSessionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'archived').default('active'),
});

export const getMessagesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  before: Joi.date().iso().optional(),
});
