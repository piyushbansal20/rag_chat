import { Router } from 'express';
import * as documentController from '../controllers/document.controller.js';
import {
  authMiddleware,
  tenantMiddleware,
  validate,
  uploadLimiter,
} from '../middleware/index.js';
import { upload, handleUploadError } from '../middleware/upload.middleware.js';
import { updateDocumentSchema, listDocumentsSchema } from '../validators/document.validator.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Upload documents
router.post(
  '/upload',
  uploadLimiter,
  upload.array('files', 10),
  handleUploadError,
  documentController.uploadDocuments
);

// List documents
router.get(
  '/',
  validate(listDocumentsSchema, 'query'),
  documentController.listDocuments
);

// Get document by ID
router.get('/:id', documentController.getDocument);

// Update document metadata
router.patch(
  '/:id',
  validate(updateDocumentSchema),
  documentController.updateDocument
);

// Delete document
router.delete('/:id', documentController.deleteDocument);

// Get document processing status
router.get('/:id/status', documentController.getDocumentStatus);

// Download document
router.get('/:id/download', documentController.downloadDocument);

export default router;
