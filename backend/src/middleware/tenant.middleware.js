import { Company } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Tenant isolation middleware - ensures all queries are scoped to company
 */
const tenantMiddleware = asyncHandler(async (req, res, next) => {
  if (!req.companyId) {
    throw ApiError.unauthorized('Company context required');
  }

  const company = await Company.findById(req.companyId).lean();

  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (company.status !== 'active') {
    throw ApiError.forbidden('Company account is suspended');
  }

  // Attach company to request
  req.company = company;

  // Attach tenant filter for database queries
  req.tenantFilter = { company: req.companyId };

  next();
});

export default tenantMiddleware;
