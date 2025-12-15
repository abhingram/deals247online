# n8n Workflows for Amazon Integration

This directory contains n8n workflow files for automating the Amazon PA-API integration with Deals247.

## Prerequisites

1. **n8n Installation**: Install n8n on your system or use n8n cloud
   ```bash
   npm install -g n8n
   n8n start
   ```

2. **Admin Token**: Generate an admin authentication token for API access
   - This should be a JWT token with admin privileges
   - Update `YOUR_ADMIN_TOKEN_HERE` in all workflow files

3. **Email Configuration**: Configure email credentials in n8n for notifications

## Workflow Files

### 1. `amazon-daily-ingestion.json`
**Purpose**: Daily bulk product ingestion from Amazon
**Schedule**: Every 24 hours
**What it does**:
- Triggers product ingestion for multiple categories
- Sends success/failure notifications
- Processes up to 200 products per category

**Categories included**:
- Electronics
- Fashion
- Home
- Books
- Sports

### 2. `amazon-hourly-refresh.json`
**Purpose**: Hourly price monitoring and deal detection
**Schedule**: Every hour
**What it does**:
- Refreshes prices for all active products
- Detects new deals automatically
- Sends notifications for new deals found
- Reports price changes and processing stats

### 3. `amazon-health-monitor.json`
**Purpose**: System health monitoring
**Schedule**: Every 6 hours
**What it does**:
- Tests API connectivity
- Retrieves system statistics
- Sends alerts if health checks fail
- Monitors overall system status

### 4. `amazon-weekly-maintenance.json`
**Purpose**: Weekly cleanup and reporting
**Schedule**: Every week
**What it does**:
- Cleans up expired deals
- Generates weekly statistics report
- Sends comprehensive maintenance summary

## Setup Instructions

### Step 1: Import Workflows
1. Open n8n web interface (usually http://localhost:5678)
2. Click "Import" button
3. Upload each `.json` workflow file
4. Review and save each workflow

### Step 2: Configure Authentication
For each workflow, update the Authorization header:
```
Authorization: Bearer YOUR_ACTUAL_ADMIN_TOKEN
```

### Step 3: Configure Email
Set up email credentials in n8n:
1. Go to Settings → Credentials
2. Add SMTP credentials for your email provider
3. Update email addresses in workflow nodes

### Step 4: Adjust Schedules (Optional)
Modify trigger schedules based on your needs:
- Daily ingestion: Consider running during off-peak hours
- Hourly refresh: May be too frequent for production
- Health monitoring: Adjust based on criticality

## Production Considerations

### Rate Limiting
- Amazon PA-API has strict rate limits
- Monitor API usage to avoid throttling
- Consider increasing delays between requests

### Error Handling
- Workflows include basic error handling
- Consider adding retry logic for transient failures
- Set up alerts for repeated failures

### Scaling
- For high-volume operations, consider:
  - Increasing batch sizes gradually
  - Adding parallel processing
  - Implementing circuit breakers

## Monitoring & Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify admin token is valid and not expired
   - Check token has required permissions

2. **API Connection Issues**
   - Ensure Deals247 server is running
   - Check network connectivity
   - Verify API endpoints are accessible

3. **Email Delivery Problems**
   - Verify SMTP credentials
   - Check spam folders
   - Test email configuration separately

4. **Workflow Not Triggering**
   - Check n8n scheduler is running
   - Verify workflow is active
   - Review workflow execution logs

### Logs & Debugging
- Enable workflow logging in n8n settings
- Check execution history for failed runs
- Use n8n's built-in debugger for testing

## Security Best Practices

1. **Token Management**
   - Use strong, unique admin tokens
   - Rotate tokens regularly
   - Store tokens securely (not in workflow files)

2. **API Security**
   - Use HTTPS for all API calls
   - Implement proper authentication
   - Monitor for unauthorized access

3. **Email Security**
   - Use secure SMTP connections
   - Avoid sending sensitive data via email
   - Implement email encryption if needed

## Customization

### Adding New Categories
Edit the ingestion workflow to include new product categories:
```json
{
  "name": "categories",
  "value": "[\"Electronics\", \"Fashion\", \"Home\", \"Books\", \"Sports\", \"NEW_CATEGORY\"]"
}
```

### Modifying Thresholds
Adjust deal detection thresholds in the refresh workflow by updating the API parameters.

### Custom Notifications
Add custom notification logic using n8n's conditional nodes and email templates.

## Backup & Recovery

- Export workflows regularly
- Keep backup copies of workflow files
- Document any custom modifications
- Test workflows after n8n updates

## Support

For issues with these workflows:
1. Check n8n documentation: https://docs.n8n.io/
2. Review Deals247 API documentation
3. Check workflow execution logs
4. Test API endpoints manually