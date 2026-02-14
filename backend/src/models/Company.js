import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Company slug is required'],
      unique: true,
      lowercase: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    settings: {
      maxUsers: {
        type: Number,
        default: 10,
      },
      maxDocuments: {
        type: Number,
        default: 100,
      },
      maxStorageMB: {
        type: Number,
        default: 1024, // 1GB
      },
      aiModel: {
        type: String,
        default: 'gpt-4o-mini',
      },
      rateLimitPerMinute: {
        type: Number,
        default: 60,
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'starter', 'pro', 'enterprise'],
        default: 'free',
      },
      validUntil: {
        type: Date,
      },
      features: [String],
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },
    metadata: {
      industry: String,
      size: String,
      website: String,
    },
    usage: {
      currentStorageMB: {
        type: Number,
        default: 0,
      },
      totalDocuments: {
        type: Number,
        default: 0,
      },
      totalUsers: {
        type: Number,
        default: 0,
      },
    },
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

// Indexes
companySchema.index({ status: 1 });
companySchema.index({ 'subscription.plan': 1 });

const Company = mongoose.model('Company', companySchema);

export default Company;
