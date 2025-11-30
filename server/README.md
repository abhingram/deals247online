# Deals247 Backend Setup

## Database Setup

1. **Import the database schema**:
   - Open your MySQL client or phpMyAdmin
   - Connect to your database: `u515501238_deals247_db`
   - Run the SQL script from `server/database/schema.sql`
   - This will create tables: `deals`, `categories`, `stores`
   - Sample data will be automatically inserted

## Start the Backend Server

Run the following command to start the API server:

```bash
npm run server:dev
```

The server will run on **http://localhost:5000**

## API Endpoints

### Deals
- `GET /api/deals` - Get all deals (with filters)
  - Query params: `category`, `store`, `minPrice`, `maxPrice`, `minRating`, `verified`, `limit`, `offset`
- `GET /api/deals/:id` - Get single deal
- `POST /api/deals` - Create new deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Categories
- `GET /api/categories` - Get all categories with deal counts
- `GET /api/categories/:id` - Get single category

### Stores
- `GET /api/stores` - Get all stores with deal counts
- `GET /api/stores/:id` - Get single store

### Health Check
- `GET /api/health` - Check if API is running

## Test the API

After starting the server, test it:
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/deals
```
