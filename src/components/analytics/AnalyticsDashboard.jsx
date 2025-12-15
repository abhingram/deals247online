import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { apiService } from '@/services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [recommendationData, setRecommendationData] = useState(null);
  const [chatbotData, setChatbotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      const [summaryRes, recsRes, chatbotRes] = await Promise.all([
        apiService.get(`/analytics/dashboard/overview?period=${period}`),
        apiService.get(`/analytics/recommendations/analytics?period=${period}`),
        apiService.get(`/analytics/chatbot/analytics?period=${period}`)
      ]);

      setAnalyticsData(summaryRes.data);
      setRecommendationData(recsRes.data);
      setChatbotData(chatbotRes.data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Advanced Analytics Dashboard</h1>
        <div className="flex gap-2">
          {['7', '30', '90'].map((days) => (
            <Button
              key={days}
              variant={period === days ? 'default' : 'outline'}
              onClick={() => setPeriod(days)}
            >
              {days} Days
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="chatbot">Chatbot Analytics</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab data={analyticsData} />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <RecommendationsTab data={recommendationData} />
        </TabsContent>

        <TabsContent value="chatbot" className="space-y-4">
          <ChatbotTab data={chatbotData} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <InsightsTab
            analytics={analyticsData}
            recommendations={recommendationData}
            chatbot={chatbotData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ data }) {
  if (!data) return <div>No data available</div>;

  const { users, deals, events } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{users?.active_users || 0}</div>
          <p className="text-xs text-muted-foreground">
            Avg session: {Math.round(users?.avg_session_duration || 0)}s
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Deal Views</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{deals?.total_views || 0}</div>
          <p className="text-xs text-muted-foreground">
            {deals?.total_clicks || 0} clicks
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{deals?.total_conversions || 0}</div>
          <p className="text-xs text-muted-foreground">
            Revenue: ${deals?.total_revenue || 0}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Event</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{events?.[0]?.event_type || 'N/A'}</div>
          <p className="text-xs text-muted-foreground">
            {events?.[0]?.count || 0} occurrences
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendationsTab({ data }) {
  if (!data) return <div>No recommendation data available</div>;

  const { performance } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {performance?.map((item, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">{item.recommendation_type}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <Badge variant="secondary">{item.total_recommendations}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Clicks:</span>
                  <Badge variant="outline">{item.total_clicks}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Conversions:</span>
                  <Badge variant="outline">{item.total_conversions}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Click Rate:</span>
                  <Badge variant={item.click_rate > 20 ? 'default' : 'secondary'}>
                    {item.click_rate?.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommendation Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="recommendation_type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="click_rate" fill="#8884d8" name="Click Rate %" />
              <Bar dataKey="conversion_rate" fill="#82ca9d" name="Conversion Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatbotTab({ data }) {
  if (!data) return <div>No chatbot data available</div>;

  const { summary, intents } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_conversations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.unique_users || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Helpful Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.helpful_rate ? (summary.helpful_rate * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg per Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.total_conversations && summary?.unique_sessions
                ? (summary.total_conversations / summary.unique_sessions).toFixed(1)
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Intent Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={intents}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ intent, intent_count }) => `${intent}: ${intent_count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="intent_count"
              >
                {intents?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsTab({ analytics, recommendations, chatbot }) {
  const generateInsights = () => {
    const insights = [];

    // User engagement insights
    if (analytics?.users?.active_users > 0) {
      insights.push({
        type: 'engagement',
        title: 'User Engagement',
        message: `Active users: ${analytics.users.active_users}. Average session duration: ${Math.round(analytics.users.avg_session_duration || 0)} seconds.`,
        priority: 'high'
      });
    }

    // Recommendation performance insights
    if (recommendations?.performance) {
      const bestPerforming = recommendations.performance.reduce((best, current) =>
        (current.click_rate > best.click_rate) ? current : best
      , recommendations.performance[0]);

      if (bestPerforming) {
        insights.push({
          type: 'recommendations',
          title: 'Best Performing Recommendations',
          message: `${bestPerforming.recommendation_type} recommendations have a ${bestPerforming.click_rate?.toFixed(1)}% click rate.`,
          priority: bestPerforming.click_rate > 25 ? 'high' : 'medium'
        });
      }
    }

    // Chatbot insights
    if (chatbot?.summary) {
      const helpfulRate = chatbot.summary.helpful_rate * 100;
      insights.push({
        type: 'chatbot',
        title: 'Chatbot Performance',
        message: `Helpful response rate: ${helpfulRate?.toFixed(1)}%. Total conversations: ${chatbot.summary.total_conversations}.`,
        priority: helpfulRate > 70 ? 'high' : helpfulRate > 50 ? 'medium' : 'low'
      });
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{insight.title}</h3>
                  <Badge
                    variant={
                      insight.priority === 'high' ? 'default' :
                      insight.priority === 'medium' ? 'secondary' : 'outline'
                    }
                  >
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{insight.message}</p>
              </div>
            ))}

            {insights.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No insights available yet. Data will appear as users interact with the platform.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {insights.some(i => i.type === 'recommendations' && i.priority === 'high') && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  🎯 <strong>Great recommendation performance!</strong> Consider promoting the best-performing recommendation type.
                </p>
              </div>
            )}

            {insights.some(i => i.type === 'chatbot' && i.priority === 'low') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  🤖 <strong>Chatbot needs improvement.</strong> Consider training the AI model with more conversation data.
                </p>
              </div>
            )}

            {insights.some(i => i.type === 'engagement' && (analytics?.users?.avg_session_duration || 0) < 60) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  📈 <strong>Low engagement detected.</strong> Consider improving deal discovery and recommendation algorithms.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}