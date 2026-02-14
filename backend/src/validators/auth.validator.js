import Joi from 'joi';

// Password must have: 8+ chars, uppercase, lowercase, number, special char
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const registerSchema = Joi.object({
  email: Joi.string().email().required().max(255).lowercase().trim().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base':
      'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().required().trim().min(1).max(50).messages({
    'any.required': 'First name is required',
    'string.max': 'First name cannot exceed 50 characters',
  }),
  lastName: Joi.string().required().trim().min(1).max(50).messages({
    'any.required': 'Last name is required',
    'string.max': 'Last name cannot exceed 50 characters',
  }),
  companyName: Joi.string().required().trim().min(2).max(100).messages({
    'any.required': 'Company name is required',
    'string.min': 'Company name must be at least 2 characters',
    'string.max': 'Company name cannot exceed 100 characters',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base':
      'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)',
    'any.required': 'Password is required',
  }),
});
