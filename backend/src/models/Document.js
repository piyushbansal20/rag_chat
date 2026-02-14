import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',

        // Spreadsheets
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',

        // Presentations
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',

        // Web/Markup
        'text/html',
        'text/markdown',
        'text/x-markdown',

        // Images (OCR)
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/tiff',
        'image/bmp',
        'image/webp',
      ],
    },
    fileSize: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'failed', 'deleted'],
      default: 'pending',
      index: true,
    },
    processing: {
      startedAt: Date,
      completedAt: Date,
      error: String,
      pageCount: Number,
      wordCount: Number,
      chunkCount: Number,
      totalTokens: Number,
      extractionMethod: String,
      chunkingStrategy: String,
      documentType: {
        type: String,
        enum: ['financial', 'legal', 'business', 'general'],
        default: 'general',
      },
      hasDetectedTables: {
        type: Boolean,
        default: false,
      },
    },
    metadata: {
      title: String,
      description: String,
      tags: [String],
      category: String,
    },
    // Vector IDs stored in ChromaDB for this document
    vectorIds: [String],
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for efficient tenant-scoped queries
documentSchema.index({ company: 1, status: 1 });
documentSchema.index({ company: 1, createdAt: -1 });
documentSchema.index({ company: 1, 'metadata.tags': 1 });

// Virtual for file extension
documentSchema.virtual('extension').get(function () {
  return this.originalName.split('.').pop()?.toLowerCase();
});

// Static method to get company storage usage
documentSchema.statics.getStorageUsage = async function (companyId) {
  const result = await this.aggregate([
    { $match: { company: companyId, status: { $ne: 'deleted' } } },
    { $group: { _id: null, totalSize: { $sum: '$fileSize' }, count: { $sum: 1 } } },
  ]);
  return result[0] || { totalSize: 0, count: 0 };
};

const Document = mongoose.model('Document', documentSchema);

export default Document;
