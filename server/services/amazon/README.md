# Amazon PA-API 5.0 Integration

This directory contains the Amazon Product Advertising API 5.0 integration for automated deal discovery and price monitoring.

## Overview

The Amazon integration consists of several components:

- **amazonClient.js**: Handles AWS Signature v4 authentication and API communication
- **amazonNormalizer.js**: Transforms Amazon API responses into standardized product data
- **amazonIngestor.js**: Orchestrates bulk product ingestion from Amazon
- **amazonRefresher.js**: Monitors price changes and detects deals
- **amazon.js (routes)**: REST API endpoints for managing the integration

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Amazon PA-API Credentials
AMAZON_ACCESS_KEY=your_access_key_here
AMAZON_SECRET_KEY=your_secret_key_here
AMAZON_ASSOCIATE_TAG=your_associate_tag_here

# Amazon Configuration
AMAZON_REGION=us-east-1
AMAZON_HOST=webservices.amazon.com
```

### 2. Database Setup

Run the database migrations to create the required tables:

```sql
-- Products table for storing Amazon products
-- Price history table for tracking price changes
-- See server/database/schema.sql for full schema
```

### 3. API Testing

Test the integration with the provided script:

```bash
cd server
node scripts/test-amazon-integration.js
```

## API Endpoints

### Statistics
```
GET /api/internal/amazon/stats
```
Get comprehensive statistics about the Amazon integration.

### Product Ingestion
```
POST /api/internal/amazon/ingest
Content-Type: application/json

{
  "categories": ["Electronics", "Fashion"],
  "keywords": ["laptop", "phone"],
  "maxItems": 100
}
```
Trigger bulk product ingestion for specified categories.

### Price Refresh
```
POST /api/internal/amazon/refresh
Content-Type: application/json

{
  "category": "Electronics"  // Optional: refresh specific category only
}
```
Refresh prices for all products or a specific category.

### Cleanup Expired Deals
```
POST /api/internal/amazon/cleanup
```
Remove deals that no longer meet the discount threshold.

### List Products
```
GET /api/internal/amazon/products?category=Electronics&limit=50&offset=0
```
Get paginated list of Amazon products with filtering options.

### List Amazon Deals
```
GET /api/internal/amazon/deals?limit=50&offset=0
```
Get deals generated from Amazon price monitoring.

### Price History
```
GET /api/internal/amazon/price-history/{productId}
```
Get price change history for a specific product.

### Connection Test
```
POST /api/internal/amazon/test-connection
```
Test Amazon API connectivity and credentials.

## Usage Examples

### Basic Ingestion
```javascript
// Ingest electronics products
const response = await fetch('/api/internal/amazon/ingest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    categories: ['Electronics'],
    maxItems: 50
  })
});
```

### Scheduled Refresh
```javascript
// Refresh all prices (run daily/hourly)
const response = await fetch('/api/internal/amazon/refresh', {
  method: 'POST'
});
```

### Monitor Integration Health
```javascript
// Get statistics
const stats = await fetch('/api/internal/amazon/stats');
const data = await stats.json();

console.log('Products:', data.data.ingestor.products.total_products);
console.log('Active Deals:', data.data.refresher.deals.active_deals);
```

## Configuration

### Rate Limiting
- Batch size: 10 products per API call
- Delay between batches: 2 seconds
- Daily API limits depend on your Amazon account tier

### Deal Detection
- Minimum discount threshold: 15%
- Automatic deal creation/update when threshold is met
- Expired deals are automatically cleaned up

### Categories
Supported categories for ingestion:
- Electronics
- Fashion
- Home
- Books
- Sports
- Beauty
- Toys
- Automotive

## Monitoring & Maintenance

### Key Metrics to Monitor
- API call success rate
- Product ingestion rate
- Price change detection accuracy
- Deal creation/update frequency

### Maintenance Tasks
- Regular cleanup of expired deals
- Monitor API quota usage
- Update product information periodically
- Archive old price history records

## Troubleshooting

### Common Issues

1. **API Authentication Errors**
   - Verify AWS credentials are correct
   - Check associate tag is valid
   - Ensure region is set correctly

2. **Rate Limiting**
   - Reduce batch sizes
   - Increase delays between calls
   - Implement exponential backoff

3. **Data Normalization Issues**
   - Check Amazon API response format changes
   - Update normalizer for new fields
   - Handle missing or malformed data gracefully

4. **Database Connection Issues**
   - Verify database credentials
   - Check table schemas are up to date
   - Monitor connection pool usage

### Debug Mode
Enable detailed logging by setting:
```env
NODE_ENV=development
DEBUG=amazon:*
```

## Future Enhancements

- [ ] n8n workflow automation
- [ ] Advanced deal detection algorithms
- [ ] Product image analysis
- [ ] Competitor price comparison
- [ ] User notification system
- [ ] Analytics dashboard
- [ ] A/B testing for deal presentation