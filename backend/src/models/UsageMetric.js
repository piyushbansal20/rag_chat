import mongoose from 'mongoose';

const usageMetricSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    metrics: {
      apiCalls: {
        type: Number,
        default: 0,
      },
      documentsUploaded: {
        type: Number,
        default: 0,
      },
      chatMessages: {
        type: Number,
        default: 0,
      },
      tokensUsed: {
        prompt: {
          type: Number,
          default: 0,
        },
        completion: {
          type: Number,
          default: 0,
        },
        embedding: {
          type: Number,
          default: 0,
        },
        total: {
          type: Number,
          default: 0,
        },
      },
      storageUsedBytes: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for analytics queries
usageMetricSchema.index({ company: 1, date: -1 });
usageMetricSchema.index({ company: 1, user: 1, date: -1 });
usageMetricSchema.index({ user: 1, date: -1 });

// Unique constraint to prevent duplicate daily records
usageMetricSchema.index({ company: 1, user: 1, date: 1 }, { unique: true });

// Static method to increment usage
usageMetricSchema.statics.incrementUsage = async function (
  companyId,
  userId,
  updates
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const incrementFields = {};

  if (updates.apiCalls) {
    incrementFields['metrics.apiCalls'] = updates.apiCalls;
  }
  if (updates.documentsUploaded) {
    incrementFields['metrics.documentsUploaded'] = updates.documentsUploaded;
  }
  if (updates.chatMessages) {
    incrementFields['metrics.chatMessages'] = updates.chatMessages;
  }
  if (updates.promptTokens) {
    incrementFields['metrics.tokensUsed.prompt'] = updates.promptTokens;
    incrementFields['metrics.tokensUsed.total'] = updates.promptTokens;
  }
  if (updates.completionTokens) {
    incrementFields['metrics.tokensUsed.completion'] = updates.completionTokens;
    incrementFields['metrics.tokensUsed.total'] =
      (incrementFields['metrics.tokensUsed.total'] || 0) + updates.completionTokens;
  }
  if (updates.embeddingTokens) {
    incrementFields['metrics.tokensUsed.embedding'] = updates.embeddingTokens;
    incrementFields['metrics.tokensUsed.total'] =
      (incrementFields['metrics.tokensUsed.total'] || 0) + updates.embeddingTokens;
  }
  if (updates.storageBytes) {
    incrementFields['metrics.storageUsedBytes'] = updates.storageBytes;
  }

  return this.findOneAndUpdate(
    { company: companyId, user: userId, date: today },
    { $inc: incrementFields },
    { upsert: true, new: true }
  );
};

// Static method to get aggregated usage for a company
usageMetricSchema.statics.getCompanyUsage = async function (
  companyId,
  startDate,
  endDate
) {
  return this.aggregate([
    {
      $match: {
        company: new mongoose.Types.ObjectId(companyId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalApiCalls: { $sum: '$metrics.apiCalls' },
        totalDocuments: { $sum: '$metrics.documentsUploaded' },
        totalMessages: { $sum: '$metrics.chatMessages' },
        totalTokens: { $sum: '$metrics.tokensUsed.total' },
        promptTokens: { $sum: '$metrics.tokensUsed.prompt' },
        completionTokens: { $sum: '$metrics.tokensUsed.completion' },
        embeddingTokens: { $sum: '$metrics.tokensUsed.embedding' },
      },
    },
  ]);
};

const UsageMetric = mongoose.model('UsageMetric', usageMetricSchema);

export default UsageMetric;
