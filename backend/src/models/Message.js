import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // Sources used in RAG response
    sources: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
        documentName: String,
        chunkIndex: Number,
        relevanceScore: Number,
        excerpt: String,
      },
    ],
    tokens: {
      prompt: Number,
      completion: Number,
      total: Number,
    },
    metadata: {
      model: String,
      latencyMs: Number,
      finishReason: String,
      cached: {
        type: Boolean,
        default: false,
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

// Compound index for session-scoped message retrieval
messageSchema.index({ session: 1, createdAt: 1 });
messageSchema.index({ company: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
