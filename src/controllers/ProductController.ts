import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { ApiResponse, CreateProductRequest, ReserveProductRequest, CheckoutRequest, BulkReserveRequest } from '../types';

export class ProductController {
  static async createProduct(req: Request, res: Response) {
    try {
      const { name, description, total_stock }: CreateProductRequest = req.body;
      
      const product = await ProductService.createProduct(name, total_stock || 0, description);
      
      const response: ApiResponse = {
        success: true,
        data: product,
        message: 'Product created successfully',
      };
      
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
      res.status(400).json(response);
    }
  }

  static async reserveProduct(req: Request, res: Response) {
    try {
      const { user_id, product_id, quantity }: ReserveProductRequest = req.body;
      
      const reservation = await ProductService.reserveProduct({
        user_id,
        product_id,
        quantity,
      });
      
      const response: ApiResponse = {
        success: true,
        data: reservation,
        message: 'Product reserved successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
      res.status(400).json(response);
    }
  }

  static async checkout(req: Request, res: Response) {
    try {
      const { user_id, product_id, quantity, total_amount }: CheckoutRequest = req.body;
      
      const order = await ProductService.checkout({
        user_id,
        product_id,
        quantity,
        total_amount,
      });
      
      const response: ApiResponse = {
        success: true,
        data: order,
        message: 'Checkout completed successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
      res.status(400).json(response);
    }
  }

  static async cancelReservation(req: Request, res: Response) {
    try {
      const { userId, productId } = req.params;
      
      await ProductService.cancelReservation(userId as string, productId as string);
      
      const response: ApiResponse = {
        success: true,
        message: 'Reservation cancelled successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
      res.status(400).json(response);
    }
  }

  static async getProductStatus(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      
      const status = await ProductService.getProductStatus(productId as string);
      
      const response: ApiResponse = {
        success: true,
        data: status,
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
      res.status(404).json(response);
    }
  }

  static async getUserReservations(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const reservations = await ProductService.getUserReservations(userId as string);
      
      const response: ApiResponse = {
        success: true,
        data: reservations,
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
      res.status(400).json(response);
    }
  }

  static async bulkReserve(req: Request, res: Response) {
    try {
      const { user_id, items }: BulkReserveRequest = req.body;
      
      const result = await ProductService.bulkReserve({
        user_id,
        items,
      });
      
      const response: ApiResponse = {
        success: result.success,
        data: result,
        message: result.success ? 'Bulk reservation successful' : 'Some reservations failed',
      };
      
      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
      res.status(400).json(response);
    }
  }
}