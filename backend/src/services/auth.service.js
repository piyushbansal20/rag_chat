import slugify from 'slugify';
import { User, Company, RefreshToken } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/tokenUtils.js';

class AuthService {
  /**
   * Register a new user and company
   */
  async register({ email, password, firstName, lastName, companyName }) {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    // Create unique company slug
    let companySlug = slugify(companyName, { lower: true, strict: true });
    let counter = 1;
    while (await Company.findOne({ slug: companySlug })) {
      companySlug = `${slugify(companyName, { lower: true, strict: true })}-${counter}`;
      counter++;
    }

    // Create company
    const company = await Company.create({
      name: companyName,
      slug: companySlug,
    });

    // Create user as company admin
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      company: company._id,
      role: 'admin',
    });

    // Update company owner
    company.owner = user._id;
    company.usage.totalUsers = 1;
    await company.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    await RefreshToken.createToken(user._id, refreshToken, getRefreshTokenExpiry());

    return {
      user: this.sanitizeUser(user),
      company: {
        id: company._id,
        name: company.name,
        slug: company.slug,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(email, password, deviceInfo = {}) {
    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden('Account is not active');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Get company
    const company = await Company.findById(user.company);
    if (!company || company.status !== 'active') {
      throw ApiError.forbidden('Company account is not active');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    await RefreshToken.createToken(user._id, refreshToken, getRefreshTokenExpiry(), deviceInfo);

    return {
      user: this.sanitizeUser(user),
      company: {
        id: company._id,
        name: company.name,
        slug: company.slug,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    const tokenDoc = await RefreshToken.findValidToken(refreshToken);

    if (!tokenDoc) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(tokenDoc.user);

    if (!user || user.status !== 'active') {
      throw ApiError.unauthorized('User not found or inactive');
    }

    const accessToken = generateAccessToken(user);

    return { accessToken };
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken) {
    if (refreshToken) {
      await RefreshToken.revokeToken(refreshToken);
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await RefreshToken.revokeAllUserTokens(userId);
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const user = await User.findById(userId).populate('company', 'name slug');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Remove sensitive fields from user object
   */
  sanitizeUser(user) {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    delete obj.__v;
    return obj;
  }
}

export default new AuthService();
