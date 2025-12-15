import mysql from 'mysql2/promise.js';

/**
 * AI Chatbot Service
 * Handles natural language deal inquiries and provides intelligent responses
 */
export class ChatbotService {
  constructor() {
    this.connection = null;
  }

  async connect() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
      });
    }
    return this.connection;
  }

  /**
   * Process user message and generate response
   */
  async processMessage(message, userId = null, sessionId = null, context = {}) {
    try {
      const intent = this.classifyIntent(message);
      const entities = this.extractEntities(message);

      let response = '';
      let deals = [];
      let helpful = null;

      switch (intent) {
        case 'search_deals':
          ({ response, deals } = await this.handleDealSearch(entities, context));
          break;

        case 'deal_details':
          ({ response, deals } = await this.handleDealDetails(entities));
          break;

        case 'category_browse':
          ({ response, deals } = await this.handleCategoryBrowse(entities));
          break;

        case 'price_inquiry':
          ({ response, deals } = await this.handlePriceInquiry(entities));
          break;

        case 'recommendation':
          ({ response, deals } = await this.handleRecommendation(userId, entities));
          break;

        case 'help':
          response = this.getHelpMessage();
          break;

        default:
          response = this.getFallbackResponse();
      }

      // Store conversation for analytics
      if (sessionId) {
        await this.storeConversation(sessionId, userId, message, response, intent, context);
      }

      return {
        response,
        deals: deals.slice(0, 5), // Limit to 5 deals in response
        intent,
        entities,
        sessionId
      };
    } catch (error) {
      console.error('Error processing chatbot message:', error);
      return {
        response: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        deals: [],
        intent: 'error',
        entities: {},
        sessionId
      };
    }
  }

  /**
   * Classify user intent from message
   */
  classifyIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Search patterns
    if (lowerMessage.match(/\b(find|search|looking for|show me)\b.*\b(deals?|offers?|discounts?)\b/)) {
      return 'search_deals';
    }

    // Deal details patterns
    if (lowerMessage.match(/\b(tell me about|details|information|more about)\b/)) {
      return 'deal_details';
    }

    // Category browsing
    if (lowerMessage.match(/\b(electronics|clothing|fashion|home|gaming|books|toys|sports)\b.*\b(deals?|offers?)\b/)) {
      return 'category_browse';
    }

    // Price inquiries
    if (lowerMessage.match(/\b(under|below|less than|cheap|expensive|price|cost)\b.*\b(\$?\d+)/)) {
      return 'price_inquiry';
    }

    // Recommendations
    if (lowerMessage.match(/\b(recommend|suggest|what should I|good deals?|best)\b/)) {
      return 'recommendation';
    }

    // Help patterns
    if (lowerMessage.match(/\b(help|how|what can you|commands|features)\b/)) {
      return 'help';
    }

    return 'unknown';
  }

  /**
   * Extract entities from message (categories, prices, etc.)
   */
  extractEntities(message) {
    const entities = {
      categories: [],
      priceRange: null,
      keywords: []
    };

    const lowerMessage = message.toLowerCase();

    // Extract categories
    const categoryMap = {
      electronics: ['electronics', 'electronic', 'tech', 'technology', 'gadgets', 'phones', 'laptops'],
      clothing: ['clothing', 'clothes', 'fashion', 'apparel', 'shoes', 'wear'],
      home: ['home', 'kitchen', 'furniture', 'decor', 'garden', 'household'],
      gaming: ['gaming', 'games', 'video games', 'consoles', 'playstation', 'xbox', 'nintendo'],
      books: ['books', 'reading', 'novels', 'textbooks'],
      sports: ['sports', 'fitness', 'exercise', 'outdoor', 'athletic'],
      toys: ['toys', 'kids', 'children', 'games']
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        entities.categories.push(category);
      }
    }

    // Extract price range
    const priceMatch = lowerMessage.match(/\$?(\d+)(?:\s*-\s*\$?(\d+))?/);
    if (priceMatch) {
      const minPrice = parseInt(priceMatch[1]);
      const maxPrice = priceMatch[2] ? parseInt(priceMatch[2]) : minPrice * 2;
      entities.priceRange = { min: minPrice, max: maxPrice };
    }

    // Extract keywords (simple approach)
    const words = message.toLowerCase().split(/\s+/);
    entities.keywords = words.filter(word =>
      word.length > 3 &&
      !['find', 'search', 'looking', 'show', 'deals', 'offers', 'discounts', 'under', 'below'].includes(word)
    ).slice(0, 5);

    return entities;
  }

  /**
   * Handle deal search queries
   */
  async handleDealSearch(entities, context) {
    const conn = await this.connect();

    try {
      let whereConditions = ['d.deleted_at IS NULL', 'd.expires_at > NOW()'];
      let params = [];

      // Add category filter
      if (entities.categories.length > 0) {
        whereConditions.push(`d.category IN (${entities.categories.map(() => '?').join(',')})`);
        params.push(...entities.categories);
      }

      // Add price filter
      if (entities.priceRange) {
        whereConditions.push('d.discounted_price BETWEEN ? AND ?');
        params.push(entities.priceRange.min, entities.priceRange.max);
      }

      // Add keyword search
      if (entities.keywords.length > 0) {
        const keywordConditions = entities.keywords.map(() => 'd.title LIKE ?').join(' OR ');
        whereConditions.push(`(${keywordConditions})`);
        params.push(...entities.keywords.map(keyword => `%${keyword}%`));
      }

      const [deals] = await conn.execute(`
        SELECT
          d.id,
          d.title,
          d.discounted_price,
          d.original_price,
          d.discount,
          d.category,
          d.store,
          d.image_url
        FROM deals d
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY d.total_views DESC, d.discount DESC
        LIMIT 10
      `, params);

      let response = '';
      if (deals.length === 0) {
        response = "I couldn't find any deals matching your criteria. Try adjusting your search terms or browse our popular categories.";
      } else {
        const categoryText = entities.categories.length > 0 ? ` in ${entities.categories.join(', ')}` : '';
        const priceText = entities.priceRange ? ` under $${entities.priceRange.max}` : '';

        response = `I found ${deals.length} great deals${categoryText}${priceText}! Here are the top results:`;
      }

      return { response, deals };
    } catch (error) {
      console.error('Error in deal search:', error);
      return {
        response: "I'm having trouble searching for deals right now. Please try again later.",
        deals: []
      };
    }
  }

  /**
   * Handle deal details inquiries
   */
  async handleDealDetails(entities) {
    // This would require more sophisticated NLP to identify specific deals
    // For now, return a generic response
    return {
      response: "I'd be happy to tell you more about specific deals! Could you tell me the name or category of the deal you're interested in?",
      deals: []
    };
  }

  /**
   * Handle category browsing
   */
  async handleCategoryBrowse(entities) {
    if (entities.categories.length === 0) {
      return {
        response: "I can help you browse deals by category! We have electronics, clothing, home, gaming, books, sports, and toys. Which category interests you?",
        deals: []
      };
    }

    const category = entities.categories[0];
    const conn = await this.connect();

    try {
      const [deals] = await conn.execute(`
        SELECT
          d.id,
          d.title,
          d.discounted_price,
          d.original_price,
          d.discount,
          d.category,
          d.store,
          d.image_url
        FROM deals d
        WHERE d.category = ? AND d.deleted_at IS NULL AND d.expires_at > NOW()
        ORDER BY d.total_views DESC
        LIMIT 5
      `, [category]);

      const response = `Here are some popular ${category} deals:`;

      return { response, deals };
    } catch (error) {
      console.error('Error browsing category:', error);
      return {
        response: `I'd love to show you ${category} deals, but I'm having trouble accessing them right now.`,
        deals: []
      };
    }
  }

  /**
   * Handle price inquiries
   */
  async handlePriceInquiry(entities) {
    if (!entities.priceRange) {
      return {
        response: "I can help you find deals within specific price ranges! For example, you can ask for deals under $50, between $50-$100, etc. What's your budget?",
        deals: []
      };
    }

    const { min, max } = entities.priceRange;
    const conn = await this.connect();

    try {
      const [deals] = await conn.execute(`
        SELECT
          d.id,
          d.title,
          d.discounted_price,
          d.original_price,
          d.discount,
          d.category,
          d.store,
          d.image_url
        FROM deals d
        WHERE d.discounted_price BETWEEN ? AND ?
          AND d.deleted_at IS NULL
          AND d.expires_at > NOW()
        ORDER BY d.discount DESC
        LIMIT 5
      `, [min, max]);

      const response = `Here are some great deals between $${min} and $${max}:`;

      return { response, deals };
    } catch (error) {
      console.error('Error in price inquiry:', error);
      return {
        response: "I'm having trouble finding deals in that price range right now.",
        deals: []
      };
    }
  }

  /**
   * Handle recommendation requests
   */
  async handleRecommendation(userId, entities) {
    if (!userId) {
      return {
        response: "I'd love to recommend personalized deals! Please log in to get recommendations based on your preferences.",
        deals: []
      };
    }

    // This would integrate with the RecommendationService
    // For now, return trending deals
    const conn = await this.connect();

    try {
      const [deals] = await conn.execute(`
        SELECT
          d.id,
          d.title,
          d.discounted_price,
          d.original_price,
          d.discount,
          d.category,
          d.store,
          d.image_url
        FROM deals d
        WHERE d.deleted_at IS NULL AND d.expires_at > NOW()
        ORDER BY (d.total_views * 0.5 + d.discount * 0.3 + COALESCE(d.avg_rating, 0) * 0.2) DESC
        LIMIT 5
      `);

      const response = "Based on popular trends and ratings, here are some deals I recommend:";

      return { response, deals };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return {
        response: "I'm having trouble generating recommendations right now.",
        deals: []
      };
    }
  }

  /**
   * Get help message
   */
  getHelpMessage() {
    return `I can help you find great deals! Here are some things you can ask me:

• "Find electronics deals under $100"
• "Show me gaming offers"
• "What are the best deals today?"
• "Recommend deals for me"
• "Find deals in clothing category"

I can search by category, price range, and keywords. What are you looking for?`;
  }

  /**
   * Get fallback response
   */
  getFallbackResponse() {
    return "I'm not sure I understood that. I can help you find deals by category, price range, or specific products. Try asking something like 'Find electronics deals under $50' or 'Show me gaming offers'.";
  }

  /**
   * Store conversation for analytics
   */
  async storeConversation(sessionId, userId, userMessage, botResponse, intent, context) {
    const conn = await this.connect();

    try {
      await conn.execute(`
        INSERT INTO chatbot_conversations
        (session_id, user_id, user_message, bot_response, intent, conversation_context)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [sessionId, userId, userMessage, botResponse, intent, JSON.stringify(context)]);
    } catch (error) {
      console.error('Error storing conversation:', error);
      // Don't throw - analytics failure shouldn't break chatbot
    }
  }

  /**
   * Mark conversation as helpful
   */
  async markHelpful(sessionId, helpful) {
    const conn = await this.connect();

    try {
      await conn.execute(`
        UPDATE chatbot_conversations
        SET was_helpful = ?
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [helpful, sessionId]);
    } catch (error) {
      console.error('Error marking conversation helpful:', error);
    }
  }
}