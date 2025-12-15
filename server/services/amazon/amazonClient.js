import crypto from 'crypto';
import { AMAZON_CONFIG } from '../../config/amazon.js';

/**
 * Amazon PA-API 5.0 Client
 * Handles AWS Signature v4 signing and API requests
 */
export class AmazonClient {
  constructor() {
    this.config = AMAZON_CONFIG;
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Generate AWS Signature v4 for request signing
   */
  generateSignature(method, uri, queryParams, payload = '') {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    // Create canonical request
    const canonicalUri = uri;
    const canonicalQuerystring = this.buildCanonicalQueryString(queryParams);
    const canonicalHeaders = `host:${this.config.host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-date';
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.config.region}/${this.config.service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    // Calculate signature
    const signature = this.calculateSignature(stringToSign, dateStamp);

    return {
      signature,
      amzDate,
      credentialScope,
      signedHeaders,
      algorithm
    };
  }

  /**
   * Calculate AWS signature
   */
  calculateSignature(stringToSign, dateStamp) {
    const kDate = crypto.createHmac('sha256', `AWS4${this.config.secretKey}`)
      .update(dateStamp).digest();

    const kRegion = crypto.createHmac('sha256', kDate)
      .update(this.config.region).digest();

    const kService = crypto.createHmac('sha256', kRegion)
      .update(this.config.service).digest();

    const kSigning = crypto.createHmac('sha256', kService)
      .update('aws4_request').digest();

    return crypto.createHmac('sha256', kSigning)
      .update(stringToSign).digest('hex');
  }

  /**
   * Build canonical query string
   */
  buildCanonicalQueryString(params) {
    return Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  /**
   * Make signed request to Amazon PA-API
   */
  async makeRequest(operation, params) {
    // Rate limiting
    await this.enforceRateLimit();

    const method = 'POST';

    // Use correct endpoints as per PA-API 5.0 specification
    let uri = '/paapi5/searchitems'; // Default for SearchItems
    if (operation === 'GetItems') {
      uri = '/paapi5/getitems';
    } else if (operation === 'GetBrowseNodes') {
      uri = '/paapi5/getbrowsenodes';
    }

    // For PA-API 5.0, we send JSON in body, not query params
    const body = JSON.stringify({
      ...params,
      PartnerTag: this.config.partnerTag,
      PartnerType: this.config.partnerType
      // Marketplace is determined by the host/region, not sent in request body
    });

    // Generate signature for POST request with JSON body
    const signatureData = this.generateSignature(method, uri, {}, body);

    // Build authorization header
    const authorizationHeader = `${signatureData.algorithm} Credential=${this.config.accessKey}/${signatureData.credentialScope}, SignedHeaders=${signatureData.signedHeaders}, Signature=${signatureData.signature}`;

    // Build headers
    const headers = {
      'Host': this.config.host,
      'X-Amz-Date': signatureData.amzDate,
      'Authorization': authorizationHeader,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Amz-Target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`,
      'Content-Encoding': 'amz-1.0' // Required for PA-API 5.0
    };

    // Make request
    const url = `https://${this.config.host}${uri}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout ? AbortSignal.timeout(this.config.timeout) : undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Amazon API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Amazon API request failed:', error);
      throw error;
    }
  }

  /**
   * Enforce rate limiting (1 request per second)
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.config.rateLimit.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Search for items using Amazon PA-API
   */
  async searchItems(searchParams) {
    const params = {
      ...this.config.defaultSearch,
      ...searchParams
    };

    return this.makeRequest('SearchItems', params);
  }

  /**
   * Get detailed information for specific items
   */
  async getItems(itemIds, resources = null) {
    const params = {
      ItemIds: itemIds,
      ItemIdType: 'ASIN',
      Resources: resources || this.config.defaultSearch.Resources
    };

    return this.makeRequest('GetItems', params);
  }

  /**
   * Get browse nodes (categories)
   */
  async getBrowseNodes(browseNodeIds) {
    const params = {
      BrowseNodeIds: browseNodeIds
    };

    return this.makeRequest('GetBrowseNodes', params);
  }
}

// Export singleton instance
export const amazonClient = new AmazonClient();