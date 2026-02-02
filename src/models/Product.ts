import { pool } from '../config/database';
import { Product, CreateProductRequest } from '../types';

export class ProductModel {
  static async create(productData: CreateProductRequest): Promise<Product> {
    const query = `
      INSERT INTO products (name, description, total_stock)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [productData.name, productData.description, productData.total_stock];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Product | null> {
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async decreaseStock(id: string, quantity: number): Promise<Product | null> {
    const query = `
      UPDATE products 
      SET total_stock = total_stock - $2 
      WHERE id = $1 AND total_stock >= $2
      RETURNING *
    `;
    const result = await pool.query(query, [id, quantity]);
    return result.rows[0] || null;
  }
}