import { redisClient } from '../config/redis';
import { ProductModel } from '../models/Product';
import { OrderModel } from '../models/Order';
import { ProductStatus, Reservation, ReserveProductRequest, CheckoutRequest, BulkReserveRequest, BulkReservationResult, BulkReserveItem } from '../types';

export class ProductService {
  private static getReservationKey(productId: string, userId: string): string {
    return `reservation:${productId}:${userId}`;
  }

  private static getProductStockKey(productId: string): string {
    return `stock:${productId}`;
  }

  private static getTotalReservedKey(productId: string): string {
    return `reserved:${productId}`;
  }

  static async createProduct(name: string, totalStock: number, description?: string) {
    const product = await ProductModel.create({
      name,
      description,
      total_stock: totalStock,
    });

    const client = redisClient.getClient();
    
    // Initialize stock and total reserved counter in Redis
    await client.mset({
      [this.getProductStockKey(product.id)]: totalStock.toString(),
      [this.getTotalReservedKey(product.id)]: '0',
    });

    return product;
  }

  static async reserveProduct(reserveData: ReserveProductRequest): Promise<Reservation> {
    const { user_id, product_id, quantity } = reserveData;
    
    const product = await ProductModel.findById(product_id);
    if (!product) {
      throw new Error('Product not found');
    }

    const stockKey = this.getProductStockKey(product_id);
    const totalReservedKey = this.getTotalReservedKey(product_id);
    const reservationKey = this.getReservationKey(product_id, user_id);

    const client = redisClient.getClient();
    
    // ATOMIC LUA SCRIPT with global reserved counter
    const result = await client.eval(
      `
      local stockKey = KEYS[1]
      local totalReservedKey = KEYS[2]
      local reservationKey = KEYS[3]
      local quantity = tonumber(ARGV[1])
      local ttl = tonumber(ARGV[2])
      
      local currentStock = tonumber(redis.call('GET', stockKey) or 0)
      local totalReserved = tonumber(redis.call('GET', totalReservedKey) or 0)
      
      -- Calculate available stock based on TOTAL reserved (not just this user's)
      local availableStock = currentStock - totalReserved
      if availableStock < quantity then
        return {0, "Insufficient stock", availableStock}
      end
      
      -- Atomically update both global reserved counter and user reservation
      redis.call('INCRBY', totalReservedKey, quantity)
      redis.call('INCRBY', reservationKey, quantity)
      redis.call('EXPIRE', reservationKey, ttl)
      
      return {1, "Reservation successful", totalReserved + quantity}
      `,
      3,
      stockKey,
      totalReservedKey,
      reservationKey,
      quantity.toString(),
      (10 * 60).toString()
    ) as number[];

    if (result[0] === 0) {
      throw new Error(result[1].toString());
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    return {
      user_id,
      product_id,
      quantity,
      expires_at: expiresAt,
    };
  }

  static async cancelReservation(userId: string, productId: string): Promise<void> {
    const reservationKey = this.getReservationKey(productId, userId);
    const totalReservedKey = this.getTotalReservedKey(productId);
    
    const exists = await redisClient.exists(reservationKey);
    if (exists === 0) {
      throw new Error('No reservation found');
    }

    const client = redisClient.getClient();
    
    // Atomically get user's reservation and decrement global counter
    await client.eval(
      `
      local reservationKey = KEYS[1]
      local totalReservedKey = KEYS[2]
      
      local reservedQty = tonumber(redis.call('GET', reservationKey) or 0)
      
      if reservedQty > 0 then
        redis.call('DECRBY', totalReservedKey, reservedQty)
      end
      redis.call('DEL', reservationKey)
      
      return 1
      `,
      2,
      reservationKey,
      totalReservedKey
    );
  }

  static async checkout(checkoutData: CheckoutRequest) {
    const { user_id, product_id, quantity, total_amount } = checkoutData;
    
    const reservationKey = this.getReservationKey(product_id, user_id);
    const totalReservedKey = this.getTotalReservedKey(product_id);
    const stockKey = this.getProductStockKey(product_id);

    const client = redisClient.getClient();
    
    // ATOMIC CHECKOUT with global reserved counter update
    const result = await client.eval(
      `
      local reservationKey = KEYS[1]
      local totalReservedKey = KEYS[2]
      local stockKey = KEYS[3]
      local quantity = tonumber(ARGV[1])
      
      local reservedQuantity = tonumber(redis.call('GET', reservationKey) or 0)
      
      if reservedQuantity < quantity then
        return {0, "Insufficient reservation"}
      end
      
      -- Atomically: reduce stock, remove reservation, decrement global counter
      redis.call('DECRBY', stockKey, quantity)
      redis.call('DECRBY', totalReservedKey, quantity)
      redis.call('DEL', reservationKey)
      
      return {1, "Checkout successful"}
      `,
      3,
      reservationKey,
      totalReservedKey,
      stockKey,
      quantity.toString()
    ) as number[];

    if (result[0] === 0) {
      throw new Error(result[1].toString());
    }

    // Sync database stock with Redis (ensure consistency)
    await ProductModel.decreaseStock(product_id, quantity);

    const order = await OrderModel.create({
      user_id,
      product_id,
      quantity,
      total_amount,
    });

    return order;
  }

  static async getProductStatus(productId: string): Promise<ProductStatus> {
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const stockKey = this.getProductStockKey(productId);
    const reservationPattern = `reservation:${productId}:*`;
    
    const client = redisClient.getClient();
    
    const [currentStock, reservationKeys] = await Promise.all([
      client.get(stockKey),
      client.keys(reservationPattern),
    ]);

    let reservedStock = 0;
    if (reservationKeys.length > 0) {
      const reservationValues = await client.mget(reservationKeys);
      reservedStock = reservationValues.reduce((sum, value) => {
        return sum + parseInt(value || '0', 10);
      }, 0);
    }

    const totalStock = parseInt(currentStock || product.total_stock.toString(), 10);
    const availableStock = totalStock - reservedStock;

    return {
      id: product.id,
      name: product.name,
      total_stock: totalStock,
      reserved_stock: reservedStock,
      available_stock: availableStock,
    };
  }

  static async getUserReservations(userId: string): Promise<Reservation[]> {
    const pattern = `reservation:*:${userId}`;
    const client = redisClient.getClient();
    
    const reservationKeys = await client.keys(pattern);
    const reservations: Reservation[] = [];

    for (const key of reservationKeys) {
      const [_, productIdStr, __] = key.split(':');
      
      const quantity = await client.get(key);
      const ttl = await client.ttl(key);
      
      if (quantity) {
        reservations.push({
          user_id: userId,
          product_id: productIdStr,
          quantity: parseInt(quantity, 10),
          expires_at: new Date(Date.now() + ttl * 1000),
        });
      }
    }

    return reservations;
  }

  static async bulkReserve(request: BulkReserveRequest): Promise<BulkReservationResult> {
    const { user_id, items } = request;
    
    const client = redisClient.getClient();
    const reserved: BulkReserveItem[] = [];
    const failed: { product_id: string; reason: string }[] = [];
    
    // Validate all products exist first
    for (const item of items) {
      const product = await ProductModel.findById(item.product_id);
      if (!product) {
        failed.push({ product_id: item.product_id, reason: 'Product not found' });
      }
    }
    
    // If any product not found, return early with failures
    if (failed.length > 0) {
      return { success: false, reserved: [], failed };
    }
    
    // Try to reserve each item atomically
    for (const item of items) {
      const stockKey = this.getProductStockKey(item.product_id);
      const totalReservedKey = this.getTotalReservedKey(item.product_id);
      const reservationKey = this.getReservationKey(item.product_id, user_id);
      
      try {
        const result = await client.eval(
          `
          local stockKey = KEYS[1]
          local totalReservedKey = KEYS[2]
          local reservationKey = KEYS[3]
          local quantity = tonumber(ARGV[1])
          local ttl = tonumber(ARGV[2])
          
          local currentStock = tonumber(redis.call('GET', stockKey) or 0)
          local totalReserved = tonumber(redis.call('GET', totalReservedKey) or 0)
          
          local availableStock = currentStock - totalReserved
          if availableStock < quantity then
            return {0, "Insufficient stock"}
          end
          
          redis.call('INCRBY', totalReservedKey, quantity)
          redis.call('INCRBY', reservationKey, quantity)
          redis.call('EXPIRE', reservationKey, ttl)
          
          return {1, "Reservation successful"}
          `,
          3,
          stockKey,
          totalReservedKey,
          reservationKey,
          item.quantity.toString(),
          (10 * 60).toString()
        ) as number[];
        
        if (result[0] === 1) {
          reserved.push({ product_id: item.product_id, quantity: item.quantity });
        } else {
          failed.push({ product_id: item.product_id, reason: result[1].toString() });
        }
      } catch {
        failed.push({ product_id: item.product_id, reason: 'Reservation failed' });
      }
    }
    
    // If any reservation failed, roll back all successful reservations
    if (failed.length > 0 && reserved.length > 0) {
      for (const item of reserved) {
        const totalReservedKey = this.getTotalReservedKey(item.product_id);
        const reservationKey = this.getReservationKey(item.product_id, user_id);
        const client = redisClient.getClient();
        
        await client.eval(
          `
          local totalReservedKey = KEYS[1]
          local reservationKey = KEYS[2]
          local quantity = tonumber(ARGV[1])
          
          redis.call('DECRBY', totalReservedKey, quantity)
          redis.call('DECRBY', reservationKey, quantity)
          
          return 1
          `,
          2,
          totalReservedKey,
          reservationKey,
          item.quantity.toString()
        );
      }
      return { success: false, reserved: [], failed };
    }
    
    return {
      success: failed.length === 0,
      reserved,
      failed,
    };
  }
}
