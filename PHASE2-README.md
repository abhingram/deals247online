# Phase 2: Amazon Integration Setup & Automation

This phase focuses on operationalizing the Amazon PA-API integration with automated workflows, monitoring dashboards, and production deployment.

## 🎯 Phase 2 Objectives

- ✅ Environment configuration for Amazon credentials
- ✅ n8n workflow automation for scheduled operations
- ✅ Production scheduler with cron jobs
- ✅ Analytics dashboard for monitoring
- ✅ PM2 ecosystem configuration for deployment

## 📋 Prerequisites

### 1. Amazon PA-API Credentials
You need an Amazon Associate account and PA-API credentials:

1. **Sign up for Amazon Associates**: https://affiliate-program.amazon.com/
2. **Apply for PA-API access**: Request Product Advertising API access
3. **Get your credentials**:
   - Access Key ID
   - Secret Access Key
   - Associate Tag (your tracking ID)

### 2. n8n Installation (Optional but Recommended)
```bash
npm install -g n8n
n8n start
```

### 3. PM2 for Production (Recommended)
```bash
npm install -g pm2
```

## ⚙️ Setup Instructions

### Step 1: Configure Environment Variables

Update `server/.env` with your Amazon credentials:

```env
# Amazon PA-API 5.0 Configuration
AMAZON_ACCESS_KEY=your_actual_access_key_here
AMAZON_SECRET_KEY=your_actual_secret_key_here
AMAZON_ASSOCIATE_TAG=your_associate_tag_here

# Amazon API Configuration
AMAZON_REGION=us-east-1
AMAZON_HOST=webservices.amazon.com
```

### Step 2: Test the Integration

Run the test script to verify everything works:

```bash
cd server
node scripts/test-amazon-integration.js
```

Expected output:
- ✅ API Connection successful
- ✅ Data normalization working
- ✅ Database connection working
- ✅ Basic operations functional

### Step 3: Set Up n8n Workflows (Optional)

1. **Import Workflows**:
   - Open n8n web interface (http://localhost:5678)
   - Import each JSON file from `n8n-workflows/`

2. **Configure Authentication**:
   - Replace `YOUR_ADMIN_TOKEN_HERE` with actual admin JWT token
   - Set up email credentials for notifications

3. **Activate Workflows**:
   - Enable all imported workflows
   - Test each workflow manually first

### Step 4: Set Up Production Scheduler

#### Option A: Using PM2 (Recommended)

```bash
# Install dependencies
npm install

# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs amazon-daily-ingestion
```

#### Option B: Using Cron Jobs

Add these lines to your crontab (`crontab -e`):

```bash
# Daily ingestion at 2 AM
0 2 * * * cd /path/to/deals247 && node server/scripts/scheduler.js daily

# Hourly refresh
0 * * * * cd /path/to/deals247 && node server/scripts/scheduler.js hourly

# Weekly maintenance (Sundays at 3 AM)
0 3 * * 0 cd /path/to/deals247 && node server/scripts/scheduler.js weekly

# Health check every 15 minutes
*/15 * * * * cd /path/to/deals247 && node server/scripts/scheduler.js health
```

### Step 5: Access Analytics Dashboard

1. **Add to Admin Panel**: Import the `AmazonDashboard.jsx` component into your admin interface
2. **Authentication**: Ensure admin users have access to the dashboard
3. **API Access**: Admin users need JWT tokens for API calls

## 📊 Monitoring & Operations

### Key Metrics to Monitor

- **Product Ingestion Rate**: Products added per day
- **Deal Detection Rate**: New deals found per hour
- **API Success Rate**: Amazon API call success percentage
- **System Health**: Database connections, memory usage

### Daily Operations

1. **Check Dashboard**: Review statistics in admin panel
2. **Monitor Logs**: Check PM2 logs for errors
3. **Review Notifications**: Check email/Slack for alerts
4. **Health Checks**: Ensure all scheduled jobs are running

### Weekly Maintenance

- Review weekly maintenance reports
- Clean up old logs if needed
- Update Amazon credentials if expired
- Optimize batch sizes based on performance

## 🔧 Configuration Tuning

### Batch Sizes
Adjust based on your API limits and performance:

```javascript
// In amazonIngestor.js
this.batchSize = 10; // Products per batch
this.delayBetweenBatches = 2000; // 2 seconds between batches
```

### Deal Thresholds
Modify deal detection sensitivity:

```javascript
// In amazonRefresher.js
this.dealThreshold = 0.15; // 15% discount minimum
```

### Schedule Adjustments
Modify timing in `ecosystem.config.js`:

```javascript
cron_restart: '0 */2 * * *', // Every 2 hours instead of 1
cron_restart: '0 6 * * *',   // Daily at 6 AM instead of 2 AM
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: Invalid Amazon credentials
```
**Solution**: Verify credentials in `.env` file and ensure they're active

#### 2. Rate Limiting
```
Error: Too many requests
```
**Solution**: Increase delays between API calls, reduce batch sizes

#### 3. Database Connection Issues
```
Error: Connection timeout
```
**Solution**: Check database credentials and connection pool settings

#### 4. Workflow Not Triggering
```
n8n workflows not running
```
**Solution**: Check n8n service status, verify workflow activation

#### 5. Memory Issues
```
Process killed due to memory limit
```
**Solution**: Increase PM2 memory limits, optimize batch processing

### Debug Commands

```bash
# Test individual components
node server/scripts/scheduler.js health
node server/scripts/scheduler.js status

# Check PM2 processes
pm2 list
pm2 logs amazon-daily-ingestion --lines 50

# Manual API testing
curl -X POST http://localhost:5000/api/internal/amazon/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 Scaling Considerations

### For High Volume

1. **Increase Batch Sizes Gradually**:
   - Monitor API limits and success rates
   - Scale up based on performance metrics

2. **Add Parallel Processing**:
   - Run multiple ingestion processes for different categories
   - Distribute load across multiple servers

3. **Database Optimization**:
   - Add indexes for frequently queried fields
   - Consider read replicas for analytics

4. **Caching Layer**:
   - Cache frequently accessed product data
   - Implement Redis for session and API response caching

## 🔒 Security Best Practices

1. **Credential Management**:
   - Store credentials securely (not in code)
   - Rotate API keys regularly
   - Use environment-specific credentials

2. **API Security**:
   - Implement rate limiting on your endpoints
   - Use HTTPS for all communications
   - Monitor for unusual API usage patterns

3. **Access Control**:
   - Restrict admin dashboard access
   - Implement proper authentication
   - Log all admin actions

## 📋 Maintenance Checklist

### Daily
- [ ] Check dashboard for errors
- [ ] Review notification emails
- [ ] Monitor API success rates
- [ ] Verify scheduled jobs ran

### Weekly
- [ ] Review maintenance reports
- [ ] Clean up old log files
- [ ] Update dependencies
- [ ] Backup database

### Monthly
- [ ] Review performance metrics
- [ ] Optimize configurations
- [ ] Update Amazon credentials
- [ ] Test disaster recovery

## 🎯 Success Metrics

Track these KPIs to measure integration success:

- **Products Ingested**: 1000+ products per week
- **Deals Detected**: 50+ new deals per week
- **API Uptime**: 99%+ success rate
- **User Engagement**: Increased deal interactions
- **Revenue Impact**: Track affiliate earnings

## 🚀 Next Steps

After Phase 2 completion:

1. **Phase 3**: Advanced analytics and reporting
2. **Phase 4**: Machine learning for deal prediction
3. **Phase 5**: Multi-platform integration (Flipkart, etc.)

## 📞 Support

For issues with Phase 2 implementation:

1. Check this README and troubleshooting section
2. Review server logs: `logs/amazon-*.log`
3. Test individual components manually
4. Check Amazon PA-API documentation
5. Verify n8n workflow configurations

---

**Phase 2 Status**: ✅ Complete - Amazon integration is now fully automated and production-ready!