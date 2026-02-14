import Joi from 'joi';

export const updateDocumentSchema = Joi.object({
  title: Joi.string().trim().max(200).optional(),
  description: Joi.string().trim().max(1000).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
  category: Joi.string().trim().max(50).optional(),
});

export const listDocumentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'processing', 'ready', 'failed').optional(),
  search: Joi.string().trim().max(100).allow('').optional(),
});
