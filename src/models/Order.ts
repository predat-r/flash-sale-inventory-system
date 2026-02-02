import { pool } from '../config/database';
import { Order, CheckoutRequest } from '../types';

export class OrderModel {
  static async create(orderData: CheckoutRequest): Promise<Order> {
    const query = `
      INSERT INTO orders (user_id, product_id, quantity, total_amount, status)
      VALUES ($1, $2, $3, $4, 'completed')
      RETURNING *
    `;
    const values = [orderData.user_id, orderData.product_id, orderData.quantity, orderData.total_amount];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: number): Promise<Order | null> {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<Order[]> {
    const query = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByProductId(productId: number): Promise<Order[]> {
    const query = 'SELECT * FROM orders WHERE product_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [productId]);
    return result.rows;
  }
}