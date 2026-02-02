export interface Product {
  id: number;
  name: string;
  description?: string;
  total_stock: number;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: number;
  user_id: string;
  product_id: number;
  quantity: number;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: Date;
}

export interface Reservation {
  user_id: string;
  product_id: number;
  quantity: number;
  expires_at: Date;
}

export interface ProductStatus {
  id: number;
  name: string;
  total_stock: number;
  reserved_stock: number;
  available_stock: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  total_stock: number;
}

export interface ReserveProductRequest {
  user_id: string;
  product_id: number;
  quantity: number;
}

export interface CheckoutRequest {
  user_id: string;
  product_id: number;
  quantity: number;
  total_amount: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}