import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { apiService } from '@/services/api';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi! I'm your AI deal assistant. I can help you find great deals, get recommendations, or answer questions about our platform. What are you looking for?",
      timestamp: new Date(),
      deals: []
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await apiService.post('/analytics/chatbot/message', {
        message: inputMessage,
        sessionId,
        context: { platform: 'web' }
      });

      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: response.response,
        timestamp: new Date(),
        deals: response.deals || [],
        sessionId: response.sessionId
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
        deals: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const rateConversation = async (helpful) => {
    try {
      await apiService.post('/analytics/chatbot/helpful', {
        sessionId,
        helpful
      });

      // Add feedback confirmation
      const feedbackMessage = {
        id: messages.length + 1,
        type: 'system',
        content: `Thanks for your feedback! ${helpful ? 'Glad I could help!' : 'Sorry I couldn\'t assist you better.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, feedbackMessage]);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const openDeal = (deal) => {
    // This would integrate with your deal opening logic
    console.log('Opening deal:', deal);
    // window.open(deal.url, '_blank');
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-96 h-[500px] shadow-2xl flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">AI Deal Assistant</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : message.type === 'system'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* Deal suggestions */}
                    {message.deals && message.deals.length > 0 && (
                      <div className="space-y-2">
                        {message.deals.map((deal, index) => (
                          <Card key={index} className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => openDeal(deal)}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm line-clamp-2">{deal.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    ${deal.discounted_price}
                                  </Badge>
                                  {deal.discount && (
                                    <Badge variant="destructive" className="text-xs">
                                      {deal.discount}% OFF
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Feedback buttons for bot messages */}
                    {message.type === 'bot' && message.sessionId && (
                      <div className="flex gap-2 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rateConversation(true)}
                          className="h-6 px-2 text-xs"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Helpful
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rateConversation(false)}
                          className="h-6 px-2 text-xs"
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          Not helpful
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about deals..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Try: "Find electronics under $100" or "Recommend deals for me"
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}