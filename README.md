# Flash Deal Cart Reservation & Checkout API

A backend API that enables users to reserve limited-stock products during flash sales without overselling, using Redis for reservation management and PostgreSQL for persistent storage.

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: Neon PostgreSQL (Serverless)
- **Cache/Reservation Store**: Upstash Redis
- **Language**: TypeScript
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Features

- ✅ Create products with initial stock limits
- ✅ Reserve products temporarily (10-minute lock)
- ✅ Automatic reservation expiration using Redis TTL
- ✅ Checkout to finalize purchases
- ✅ Cancel reservations before expiry
- ✅ Real-time product status (total/reserved/available stock)
- ✅ Concurrency-safe reservation system
- ✅ Bulk reserve multiple SKUs with transaction rollback
- ✅ Input validation on all endpoints
- ✅ Rate limiting for abuse prevention
- ✅ Error handling and logging

## Project Structure

```
src/
├── config/          # Database and Redis configuration
├── controllers/     # HTTP request handlers
├── middleware/      # Validation, error handling, rate limiting
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic layer
└── types/           # TypeScript type definitions
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by copying `.env` and updating:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `UPSTASH_REDIS_REST_URL`: Your Upstash Redis URL
   - `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Create Product
```http
POST /api/products
Content-Type: application/json

{
  "name": "Flash Deal Laptop",
  "description": "High-performance laptop with discount",
  "total_stock": 200
}
```

### Reserve Product
```http
POST /api/reserve
Content-Type: application/json

{
  "user_id": "user123",
  "product_id": 1,
  "quantity": 2
}
```

### Checkout (Complete Purchase)
```http
POST /api/checkout
Content-Type: application/json

{
  "user_id": "user123",
  "product_id": 1,
  "quantity": 2,
  "total_amount": 1999.98
}
```

### Cancel Reservation
```http
DELETE /api/reserve/:userId/:productId
```

### Get Product Status
```http
GET /api/products/:productId/status
```

### Get User Reservations
```http
GET /api/users/:userId/reservations
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "user123",
      "product_id": "1",
      "quantity": 2,
      "expires_at": "2024-01-15T10:10:00.000Z"
    }
  ]
}
```

### Reserve Multiple Products (Bonus)
```http
POST /api/reserve/bulk
Content-Type: application/json

{
  "user_id": "user123",
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 2, "quantity": 1 }
  ]
}
```

> **Note:** If any item fails, the entire transaction is rolled back.

## Reservation Lock Logic

The reservation system uses Redis with atomic operations to prevent overselling:

1. **Stock Tracking**: Each product's current stock is stored in Redis (`stock:{product_id}`)

2. **Total Reserved Counter**: A global counter tracks ALL reservations across users (`reserved:{product_id}`)

3. **User Reservation Keys**: Individual user reservations are stored with TTL (`reservation:{product_id}:{user_id}`)

4. **Atomic Lua Script**: The reservation logic uses a Lua script executed atomically by Redis:
   ```lua
   -- Get current stock and total reserved (across ALL users)
   local currentStock = tonumber(redis.call('GET', stockKey) or 0)
   local totalReserved = tonumber(redis.call('GET', totalReservedKey) or 0)

   -- Calculate available stock based on TOTAL reserved (not just this user's)
   local availableStock = currentStock - totalReserved
   if availableStock < quantity then
     return {0, "Insufficient stock"}
   end

   -- Atomically update both global counter and user reservation
   redis.call('INCRBY', totalReservedKey, quantity)
   redis.call('INCRBY', reservationKey, quantity)
   redis.call('EXPIRE', reservationKey, ttl)
   ```

5. **Concurrent Safety**: Multiple users can reserve simultaneously without race conditions. The global reserved counter ensures collective reservations never exceed stock.

### How It Prevents Collective Overselling

```
Stock = 3 units

User A reserves 2:
  - totalReserved = 0, available = 3 - 0 = 3
  - 3 >= 2 ✓ → totalReserved becomes 2

User B reserves 2:
  - totalReserved = 2, available = 3 - 2 = 1
  - 1 >= 2 ✗ → REJECTED (Insufficient stock)

Result: No overselling!
```

## Expiration Process

Reservations automatically expire after 10 minutes using Redis TTL:

- When a reservation is created, TTL is set to 600 seconds
- Redis automatically removes expired keys
- Stock becomes available for new reservations
- No manual cleanup required

## Error Responses

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

```json
{
  "success": false,
  "error": "Error description"
}
```

## Development

### Scripts
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start production server

### Environment Variables
- `PORT`: Server port (default: 3000)
- `REDIS_TTL`: Reservation TTL in seconds (default: 600)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window (default: 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

## Testing with Postman

You can test the API endpoints using either the local Postman collection or the public workspace:

### Option 1: Local Collection

1. Open Postman
2. Click **Import**
3. Select the [`postman/flash-sale-api.json`](postman/flash-sale-api.json) file
4. Update the `baseUrl` variable if needed

### Option 2: Public Postman Workspace

Use the public collection directly: [Flash Sale Reservation API](https://www.postman.com/haris-naeem/workspace/flash-sale-reservation)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC
