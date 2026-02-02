import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

// UUID regex pattern
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidId = (value: string | number): boolean => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0;
  }
  return uuidPattern.test(value.toString());
};

export const validateCreateProduct = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    total_stock: Joi.number().required().integer().min(0),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    const response: ApiResponse = {
      success: false,
      error: error.details[0].message,
    };
    return res.status(400).json(response);
  }

  next();
};

export const validateReserveProduct = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    user_id: Joi.string().required().min(1).max(255),
    product_id: Joi.alternatives().try(
      Joi.number().integer().min(1),
      Joi.string().pattern(uuidPattern)
    ).required(),
    quantity: Joi.number().required().integer().min(1),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    const response: ApiResponse = {
      success: false,
      error: error.details[0].message,
    };
    return res.status(400).json(response);
  }

  next();
};

export const validateCheckout = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    user_id: Joi.string().required().min(1).max(255),
    product_id: Joi.alternatives().try(
      Joi.number().integer().min(1),
      Joi.string().pattern(uuidPattern)
    ).required(),
    quantity: Joi.number().required().integer().min(1),
    total_amount: Joi.number().required().min(0).precision(2),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    const response: ApiResponse = {
      success: false,
      error: error.details[0].message,
    };
    return res.status(400).json(response);
  }

  next();
};

export const validateProductId = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    productId: Joi.alternatives().try(
      Joi.number().integer().min(1),
      Joi.string().pattern(uuidPattern)
    ).required(),
  }).unknown(true);

  const { error } = schema.validate(req.params);
  if (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid product ID',
    };
    return res.status(400).json(response);
  }

  next();
};

export const validateUserId = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
  }).unknown(true);

  const { error } = schema.validate(req.params);
  if (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid user ID',
    };
    return res.status(400).json(response);
  }

  next();
};