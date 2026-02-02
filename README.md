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

## Reservation Lock Logic

The reservation system uses Redis with atomic operations to prevent overselling:

1. **Stock Tracking**: Each product's current stock is stored in Redis (`stock:{product_id}`)

2. **Reservation Keys**: User reservations are stored with TTL (`reservation:{product_id}:{user_id}`)

3. **Atomic Operations**: Redis Lua scripts ensure thread-safe reservation logic:
   ```lua
   -- Check available stock
   -- Update reservation count
   -- Set expiration (10 minutes)
   ```

4. **Concurrent Safety**: Multiple users can reserve simultaneously without race conditions

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

Import the Postman collection to test the API endpoints:

1. Open Postman
2. Click **Import**
3. Select the [`postman/flash-sale-api.json`](postman/flash-sale-api.json) file
4. Update the `baseUrl` variable if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC