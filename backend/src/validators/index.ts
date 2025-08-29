import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';

// Validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(createError(message, 400));
    }

    next();
  };
};

// Auth validators
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(6).max(100).required(),
  sponsorCode: Joi.string().optional().allow(''),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Room validators
export const createRoomSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  topic: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  maxParticipants: Joi.number().integer().min(2).max(10).default(10),
  requiresMembership: Joi.boolean().default(true),
});

export const updateRoomSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  topic: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  maxParticipants: Joi.number().integer().min(2).max(10).optional(),
  requiresMembership: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

// Payment validators
export const createPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().valid('USDT', 'USDC', 'BUSD').required(),
  transactionHash: Joi.string().min(10).max(200).required(),
});

// User profile validators
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  avatar: Joi.string().uri().optional().allow(''),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(100).required(),
});

// Parameter validators
export const idParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(createError(message, 400));
    }

    next();
  };
};

// Query validators
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('createdAt', 'updatedAt', 'name', 'amount').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query);

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(createError(message, 400));
    }

    // Replace query with validated and default values
    req.query = value;
    next();
  };
};
