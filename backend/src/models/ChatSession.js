import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
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
    title: {
      type: String,
      default: 'New Chat',
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
    },
    context: {
      // Optional: limit chat to specific documents
      documents: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
      ],
      systemPrompt: String,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: Date,
    metadata: {
      model: String,
      totalTokens: {
        type: Number,
        default: 0,
      },
      totalPromptTokens: {
        type: Number,
        default: 0,
      },
      totalCompletionTokens: {
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

// Indexes for efficient queries
chatSessionSchema.index({ company: 1, user: 1, status: 1 });
chatSessionSchema.index({ company: 1, updatedAt: -1 });
chatSessionSchema.index({ user: 1, updatedAt: -1 });

// Update title from first message if still default
chatSessionSchema.methods.updateTitleFromMessage = async function (message) {
  if (this.title === 'New Chat' && message.length > 0) {
    // Use first 50 chars of message as title
    this.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    await this.save();
  }
};

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;
