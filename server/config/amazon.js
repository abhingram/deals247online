// Amazon PA-API 5.0 Configuration
// This file contains configuration for Amazon Product Advertising API integration

export const AMAZON_CONFIG = {
  // AWS Region for Amazon India (eu-west-1 as per requirements)
  region: process.env.AMAZON_REGION || 'eu-west-1',

  // Amazon Web Services host
  host: process.env.AMAZON_HOST || 'webservices.amazon.in',

  // Service name for AWS signing
  service: 'ProductAdvertisingAPI',

  // API version
  apiVersion: '2013-08-01',

  // Marketplace ID for India
  marketplace: 'A21TJRUUN4KGV',

  // Partner type (required for PA-API 5.0)
  partnerType: 'Associates',

  // Partner tag (Associate ID)
  partnerTag: process.env.AMAZON_ASSOCIATE_TAG,

  // AWS Credentials (loaded from environment)
  accessKey: process.env.AMAZON_ACCESS_KEY,
  secretKey: process.env.AMAZON_SECRET_KEY,

  // Rate limiting (Amazon allows 1 request per second)
  rateLimit: {
    requestsPerSecond: 1,
    burstLimit: 2
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000
  },

  // Request timeout
  timeout: 30000, // 30 seconds

  // Default search parameters
  defaultSearch: {
    SearchIndex: 'All',
    ItemCount: 10,
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'ItemInfo.ContentInfo',
      'ItemInfo.ProductInfo',
      'ItemInfo.TechnicalInfo',
      'Offers.Listings.Price',
      'Offers.Listings.MerchantInfo',
      'Images.Primary.Small',
      'Images.Primary.Medium',
      'Images.Primary.Large'
    ]
  },

  // Categories to monitor
  monitoredCategories: [
    'Electronics',
    'Fashion',
    'Home',
    'Books',
    'Sports',
    'Beauty',
    'Toys',
    'Automotive'
  ]
};

// Validation function for required environment variables
export const validateAmazonConfig = () => {
  const required = ['AMAZON_ACCESS_KEY', 'AMAZON_SECRET_KEY', 'AMAZON_ASSOCIATE_TAG'];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  console.log('✅ Amazon configuration validated');
  return true;
};