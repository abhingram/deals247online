/**
 * Amazon Data Normalizer
 * Transforms Amazon PA-API responses into internal Deals247 format
 */

export class AmazonNormalizer {
  constructor() {
    this.categoryMapping = {
      'Electronics': 'Electronics',
      'Computers': 'Electronics',
      'Mobile Phones': 'Electronics',
      'Fashion': 'Fashion',
      'Clothing': 'Fashion',
      'Shoes': 'Fashion',
      'Home & Kitchen': 'Home',
      'Furniture': 'Home',
      'Decor': 'Home',
      'Books': 'Books',
      'Kindle': 'Books',
      'Sports & Outdoors': 'Sports',
      'Beauty & Personal Care': 'Beauty',
      'Health & Household': 'Health',
      'Toys & Games': 'Toys',
      'Baby Products': 'Baby',
      'Automotive': 'Automotive',
      'Industrial & Scientific': 'Industrial',
      'Tools & Home Improvement': 'Home Improvement'
    };
  }

  /**
   * Normalize Amazon product data to internal format
   */
  normalizeProduct(amazonItem) {
    try {
      const itemInfo = amazonItem.ItemInfo || {};
      const offers = amazonItem.Offers || {};
      const images = amazonItem.Images || {};

      // Extract title
      const title = this.extractTitle(itemInfo);

      // Extract pricing
      const pricing = this.extractPricing(offers);

      // Extract images
      const imageUrl = this.extractImage(images);

      // Extract category
      const category = this.extractCategory(itemInfo);

      // Build product URL
      const productUrl = `https://amazon.in/dp/${amazonItem.ASIN}`;

      // Calculate discount
      const discountPercent = pricing.mrp > 0 ?
        Math.round(((pricing.mrp - pricing.price) / pricing.mrp) * 100) : 0;

      return {
        store: 'amazon',
        external_product_id: amazonItem.ASIN,
        title: title,
        price: pricing.price,
        mrp: pricing.mrp,
        discount_percent: discountPercent,
        image_url: imageUrl,
        product_url: productUrl,
        category: category,
        fetched_at: new Date().toISOString(),
        raw_data: amazonItem // Keep original data for debugging
      };

    } catch (error) {
      console.error('Error normalizing Amazon product:', error, amazonItem);
      return null;
    }
  }

  /**
   * Extract title from Amazon item info
   */
  extractTitle(itemInfo) {
    try {
      const titleInfo = itemInfo.Title || {};
      return titleInfo.DisplayValue || 'Unknown Product';
    } catch (error) {
      console.warn('Error extracting title:', error);
      return 'Unknown Product';
    }
  }

  /**
   * Extract pricing information from Amazon offers
   */
  extractPricing(offers) {
    try {
      const listings = offers.Listings || [];
      if (listings.length === 0) {
        return { price: 0, mrp: 0 };
      }

      const listing = listings[0];
      const price = listing.Price || {};
      const mrp = listing.Mrp || price;

      return {
        price: this.extractAmount(price.Amount) || 0,
        mrp: this.extractAmount(mrp.Amount) || this.extractAmount(price.Amount) || 0
      };

    } catch (error) {
      console.warn('Error extracting pricing:', error);
      return { price: 0, mrp: 0 };
    }
  }

  /**
   * Extract amount from Amazon price object
   */
  extractAmount(amount) {
    if (!amount) return 0;

    // Amazon returns amount in paisa (1/100 of rupee)
    const value = amount.Amount || amount;
    return typeof value === 'number' ? value / 100 : 0;
  }

  /**
   * Extract image URL from Amazon images
   */
  extractImage(images) {
    try {
      const primary = images.Primary || {};
      const large = primary.Large || {};
      const medium = primary.Medium || {};
      const small = primary.Small || {};

      // Prefer large image, fallback to medium, then small
      return large.URL || medium.URL || small.URL || null;

    } catch (error) {
      console.warn('Error extracting image:', error);
      return null;
    }
  }

  /**
   * Extract category from Amazon item info
   */
  extractCategory(itemInfo) {
    try {
      const classifications = itemInfo.Classifications || {};
      const binding = classifications.Binding || {};
      const productGroup = classifications.ProductGroup || {};

      const amazonCategory = binding.DisplayValue || productGroup.DisplayValue;

      // Map to our internal categories
      return this.categoryMapping[amazonCategory] || amazonCategory || 'General';

    } catch (error) {
      console.warn('Error extracting category:', error);
      return 'General';
    }
  }

  /**
   * Validate normalized product data
   */
  validateProduct(product) {
    const required = ['store', 'external_product_id', 'title'];

    for (const field of required) {
      if (!product[field]) {
        console.warn(`Missing required field: ${field}`, product);
        return false;
      }
    }

    if (product.price < 0 || product.mrp < 0) {
      console.warn('Invalid pricing data:', product);
      return false;
    }

    return true;
  }

  /**
   * Normalize multiple products from API response
   */
  normalizeProducts(apiResponse) {
    try {
      const items = apiResponse.ItemsResult?.Items || [];
      const normalized = [];

      for (const item of items) {
        const normalizedProduct = this.normalizeProduct(item);
        if (normalizedProduct && this.validateProduct(normalizedProduct)) {
          normalized.push(normalizedProduct);
        }
      }

      return normalized;

    } catch (error) {
      console.error('Error normalizing products:', error);
      return [];
    }
  }

  /**
   * Normalize search results
   */
  normalizeSearchResults(searchResponse) {
    return this.normalizeProducts(searchResponse);
  }

  /**
   * Normalize get items results
   */
  normalizeGetItemsResults(getItemsResponse) {
    return this.normalizeProducts(getItemsResponse);
  }
}

// Export singleton instance
export const amazonNormalizer = new AmazonNormalizer();