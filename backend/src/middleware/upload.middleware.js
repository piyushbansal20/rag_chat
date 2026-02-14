import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');
const TEMP_DIR = path.join(__dirname, '../../uploads/temp');

const MAX_FILE_SIZE = config.upload.maxFileSizeMB * 1024 * 1024;

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(
      new ApiError(
        400,
        `File type not allowed. Supported: PDF, DOC, DOCX, TXT, XLSX, XLS, CSV, PPTX, PPT, HTML, Markdown, and images (PNG, JPG, TIFF, BMP, WebP)`
      ),
      false
    );
    return;
  }
  cb(null, true);
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Max 10 files per request
  },
});

// Error handling wrapper
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new ApiError(400, `File too large. Maximum size: ${config.upload.maxFileSizeMB}MB`)
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ApiError(400, 'Too many files. Maximum: 10 files per upload'));
    }
    return next(new ApiError(400, err.message));
  }
  next(err);
};

export { upload, UPLOAD_DIR, TEMP_DIR };
