import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, User, Loader2, Sparkles, TrendingUp, Users, Package, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const AIAssistant = ({ 
  analytics, 
  users, 
  deals, 
  categories, 
  stores, 
  onExecuteAction 
}) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm your AI assistant for the Deals247 admin panel. I can help you with:\n\n• 📊 **Analytics & Insights** - Analyze your data and provide recommendations\n• 📝 **Content Generation** - Help create deal descriptions and marketing content\n• 🔍 **Data Queries** - Answer questions about your users, deals, and performance\n• 💡 **Recommendations** - Suggest optimizations and strategies\n• 📋 **Reports** - Generate summaries and reports\n• ⚡ **Automation** - Help with routine tasks\n\nWhat would you like to know or do today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "What's my top performing deal this month?",
    "Generate a weekly performance report",
    "Suggest deals to feature on the homepage",
    "Analyze user engagement trends",
    "Help me write a deal description",
    "Show me deals that are about to expire"
  ]);
  const scrollAreaRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const generateAIResponse = async (userMessage) => {
    // This is a mock AI response generator
    // In production, you would integrate with OpenAI, Anthropic, or another AI service
    
    const lowerMessage = userMessage.toLowerCase();
    
    // Analytics queries
    if (lowerMessage.includes('top performing') || lowerMessage.includes('best deal')) {
      const topDeal = analytics.dealPerformance?.[0];
      if (topDeal) {
        return `📈 **Top Performing Deal:** ${topDeal.title}

**Performance Metrics:**
• Views: ${topDeal.total_views || 0}
• Clicks: ${topDeal.total_clicks || 0}
• Click-through rate: ${topDeal.total_views ? Math.round((topDeal.total_clicks / topDeal.total_views) * 100) : 0}%
• Average rating: ${topDeal.avg_rating || 'N/A'}

**Recommendation:** This deal is performing exceptionally well. Consider featuring it prominently on your homepage or extending its expiration date if possible.`;
      }
    }
    
    // Report generation
    if (lowerMessage.includes('report') || lowerMessage.includes('summary')) {
      const summary = analytics.summary;
      return `📊 **Weekly Performance Report**

**Key Metrics:**
• Total Users: ${summary?.total_users || 0}
• Active Deals: ${summary?.active_deals || 0}
• Total Views: ${summary?.total_views || 0}
• Total Clicks: ${summary?.total_clicks || 0}
• Average Rating: ${summary?.avg_rating || 'N/A'}

**Top Categories:**
${analytics.categoryPerformance?.slice(0, 3).map(cat => `• ${cat.name}: ${cat.total_views || 0} views`).join('\n') || 'No category data available'}

**Recommendations:**
• Focus on ${analytics.categoryPerformance?.[0]?.name || 'your top category'} for maximum engagement
• Consider creating more deals in high-performing categories
• Monitor deals with low engagement for potential optimization`;
    }
    
    // Deal suggestions
    if (lowerMessage.includes('feature') || lowerMessage.includes('homepage')) {
      const topDeals = analytics.dealPerformance?.slice(0, 3) || [];
      return `🎯 **Homepage Feature Recommendations**

Based on current performance data, here are my top recommendations for homepage features:

${topDeals.map((deal, index) => 
  `${index + 1}. **${deal.title}**
   • Performance Score: ${deal.total_views || 0} views, ${deal.total_clicks || 0} clicks
   • Rating: ${deal.avg_rating || 'N/A'}
   • Category: ${deal.category_name || 'N/A'}`
).join('\n\n')}

**Why these deals?**
• High engagement metrics
• Good user ratings
• Recent activity indicates strong interest

**Action Items:**
• Move these deals to prominent homepage positions
• Consider extending expiration dates
• Monitor performance after featuring`;
    }
    
    // User engagement analysis
    if (lowerMessage.includes('engagement') || lowerMessage.includes('user')) {
      const engagement = analytics.userEngagement?.[0];
      return `👥 **User Engagement Analysis**

**Current Engagement Levels:**
• Most active users are viewing ${engagement?.total_views || 0} deals on average
• Top users have ${engagement?.total_favorites || 0} favorites
• Average session involves ${engagement?.unique_deals_viewed || 0} unique deals

**Trends Identified:**
• Users are most interested in ${analytics.categoryPerformance?.[0]?.name || 'popular categories'}
• Peak engagement times: Weekends and evenings
• Mobile users represent 70% of traffic

**Recommendations:**
• Send personalized recommendations based on user favorites
• Create targeted campaigns for high-engagement categories
• Optimize mobile experience for better engagement`;
    }
    
    // Content generation
    if (lowerMessage.includes('description') || lowerMessage.includes('write') || lowerMessage.includes('content')) {
      return `✍️ **Content Generation Assistant**

I can help you create compelling deal descriptions! Here's a template for an effective deal description:

---

**🎉 [Product Name] - Massive [X]% Discount!**

**Original Price:** $[Original]
**Deal Price:** $[Discounted]
**You Save:** $[Savings] ([X]% off!)

**Why This Deal Rocks:**
• [Key feature 1]
• [Key feature 2] 
• [Key feature 3]

**Limited Time Offer!** ⏰ Ends [Date/Time]

**Shop Now at [Store Name]** - Trusted retailer with fast shipping and excellent customer service!

*#deal #discount #[category] #[store]*

---

**Tips for Great Deal Descriptions:**
• Start with the discount percentage
• Include key product benefits
• Add urgency with expiration info
• Use emojis for visual appeal
• Include relevant hashtags

Would you like me to generate a specific description for one of your deals?`;
    }
    
    // Expiring deals
    if (lowerMessage.includes('expire') || lowerMessage.includes('ending')) {
      const expiringSoon = deals.filter(deal => {
        if (!deal.expires_at) return false;
        const expiryDate = new Date(deal.expires_at);
        const now = new Date();
        const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);
        return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
      });
      
      if (expiringSoon.length > 0) {
        return `⏰ **Deals Expiring Soon (Next 24 Hours)**

${expiringSoon.map(deal => 
  `**${deal.title}**
• Expires: ${new Date(deal.expires_at).toLocaleString()}
• Current Price: $${deal.discounted_price}
• Store: ${deal.store}`
).join('\n\n')}

**Recommended Actions:**
• Extend expiration dates for high-performing deals
• Send notifications to users who favorited these deals
• Consider creating flash sales to boost urgency`;
      } else {
        return `✅ **No deals expiring in the next 24 hours**

All your active deals have more than 24 hours remaining. Keep monitoring for deals that need attention!`;
      }
    }
    
    // Default response
    return `🤔 I understand you're asking about "${userMessage}". 

As your AI admin assistant, I can help with:

**Data Analysis:**
• Performance metrics and trends
• User behavior insights
• Deal effectiveness analysis

**Content Creation:**
• Deal descriptions and marketing copy
• Email campaigns and notifications
• Social media content

**Recommendations:**
• Which deals to feature
• Optimization strategies
• User engagement tactics

**Automation:**
• Report generation
• Alert setup
• Routine task assistance

Try asking me something specific like:
• "Show me my top performing deals"
• "Generate a performance report"
• "Help me write a deal description"
• "Which deals should I feature?"

What would you like to focus on?`;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const aiResponse = await generateAIResponse(input.trim());
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI response error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Admin Assistant
          </CardTitle>
          <CardDescription>
            Your intelligent assistant for admin tasks, analytics, and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Chat Interface */}
          <div className="flex flex-col h-96 border rounded-lg">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-orange-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your admin panel..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Suggestions:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Analytics & Insights</h3>
                <p className="text-sm text-gray-600">Smart data analysis and recommendations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Lightbulb className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Content Generation</h3>
                <p className="text-sm text-gray-600">AI-powered deal descriptions and marketing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Smart Recommendations</h3>
                <p className="text-sm text-gray-600">Data-driven suggestions for optimization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAssistant;