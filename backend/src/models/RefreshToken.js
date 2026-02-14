import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    device: {
      userAgent: String,
      ip: String,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index for automatic cleanup of expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for finding valid tokens
refreshTokenSchema.index({ token: 1, isRevoked: 1, expiresAt: 1 });

// Static method to create a new refresh token
refreshTokenSchema.statics.createToken = async function (userId, token, expiresAt, device = {}) {
  return this.create({
    user: userId,
    token,
    expiresAt,
    device,
  });
};

// Static method to find valid token
refreshTokenSchema.statics.findValidToken = async function (token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
};

// Static method to revoke token
refreshTokenSchema.statics.revokeToken = async function (token) {
  return this.findOneAndUpdate({ token }, { isRevoked: true }, { new: true });
};

// Static method to revoke all user tokens
refreshTokenSchema.statics.revokeAllUserTokens = async function (userId) {
  return this.updateMany({ user: userId, isRevoked: false }, { isRevoked: true });
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
