import documentService from '../services/document.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

/**
 * Upload document(s)
 * POST /api/v1/documents/upload
 */
export const uploadDocuments = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('No files provided');
  }

  const results = await documentService.uploadDocuments(
    req.files,
    req.userId,
    req.companyId
  );

  const successCount = results.filter((r) => r.success).length;
  const message = `${successCount} of ${results.length} files uploaded`;

  res.status(202).json(new ApiResponse(202, results, message));
});

/**
 * List documents
 * GET /api/v1/documents
 */
export const listDocuments = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;

  const result = await documentService.listDocuments(req.companyId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status,
    search,
  });

  res.json(new ApiResponse(200, result, 'Documents retrieved'));
});

/**
 * Get document by ID
 * GET /api/v1/documents/:id
 */
export const getDocument = asyncHandler(async (req, res) => {
  const document = await documentService.getDocument(req.params.id, req.companyId);

  res.json(new ApiResponse(200, document, 'Document retrieved'));
});

/**
 * Update document metadata
 * PATCH /api/v1/documents/:id
 */
export const updateDocument = asyncHandler(async (req, res) => {
  const { title, description, tags, category } = req.body;

  const document = await documentService.updateDocument(
    req.params.id,
    req.companyId,
    { title, description, tags, category }
  );

  res.json(new ApiResponse(200, document, 'Document updated'));
});

/**
 * Delete document
 * DELETE /api/v1/documents/:id
 */
export const deleteDocument = asyncHandler(async (req, res) => {
  const result = await documentService.deleteDocument(req.params.id, req.companyId);

  res.json(new ApiResponse(200, result, 'Document deletion queued'));
});

/**
 * Get document processing status
 * GET /api/v1/documents/:id/status
 */
export const getDocumentStatus = asyncHandler(async (req, res) => {
  const status = await documentService.getProcessingStatus(
    req.params.id,
    req.companyId
  );

  res.json(new ApiResponse(200, status, 'Status retrieved'));
});

/**
 * Download document
 * GET /api/v1/documents/:id/download
 */
export const downloadDocument = asyncHandler(async (req, res) => {
  const { path, filename, mimeType } = await documentService.getDocumentPath(
    req.params.id,
    req.companyId
  );

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(path);
});
