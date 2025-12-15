import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from '../ui/use-toast';
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database
} from 'lucide-react';

const AmazonDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeOperations, setActiveOperations] = useState([]);

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/internal/amazon/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
        setLastRefresh(new Date());
      } else {
        throw new Error('Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger product ingestion
  const triggerIngestion = async (categories = ['Electronics', 'Fashion']) => {
    const operationId = Date.now().toString();
    setActiveOperations(prev => [...prev, { id: operationId, type: 'ingestion', status: 'running' }]);

    try {
      const response = await fetch('/api/internal/amazon/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ categories, maxItems: 100 })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Ingestion completed for ${categories.length} categories`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Ingestion error:', error);
      toast({
        title: "Error",
        description: "Ingestion failed: " + error.message,
        variant: "destructive"
      });
    } finally {
      setActiveOperations(prev => prev.filter(op => op.id !== operationId));
      fetchStats(); // Refresh stats
    }
  };

  // Trigger price refresh
  const triggerRefresh = async () => {
    const operationId = Date.now().toString();
    setActiveOperations(prev => [...prev, { id: operationId, type: 'refresh', status: 'running' }]);

    try {
      const response = await fetch('/api/internal/amazon/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Price refresh completed. ${data.data.newDeals} new deals found.`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: "Price refresh failed: " + error.message,
        variant: "destructive"
      });
    } finally {
      setActiveOperations(prev => prev.filter(op => op.id !== operationId));
      fetchStats(); // Refresh stats
    }
  };

  // Test connection
  const testConnection = async () => {
    try {
      const response = await fetch('/api/internal/amazon/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Connection Test",
          description: "Amazon API connection successful ✅"
        });
      } else {
        throw new Error(data.details);
      }
    } catch (error) {
      toast({
        title: "Connection Test",
        description: "Connection failed: " + error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Amazon Integration Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage automated deal discovery
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={testConnection} variant="outline" size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Test Connection
          </Button>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Active Operations Alert */}
      {activeOperations.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {activeOperations.length} operation{activeOperations.length > 1 ? 's' : ''} running:
            {activeOperations.map(op => (
              <Badge key={op.id} variant="secondary" className="ml-2">
                {op.type} <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
              </Badge>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.ingestor?.products?.total_products || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.ingestor?.products?.active_products || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.refresher?.deals?.active_deals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {stats?.refresher?.deals?.total_deals || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Discount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.refresher?.deals?.avg_deal_discount?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              on active deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.refresher?.priceHistory?.total_records || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              tracking history
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Control Panel</CardTitle>
          <CardDescription>
            Manually trigger Amazon integration operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => triggerIngestion(['Electronics'])}
              disabled={activeOperations.some(op => op.type === 'ingestion')}
            >
              <Play className="h-4 w-4 mr-2" />
              Ingest Electronics
            </Button>
            <Button
              onClick={() => triggerIngestion(['Fashion', 'Home'])}
              disabled={activeOperations.some(op => op.type === 'ingestion')}
            >
              <Play className="h-4 w-4 mr-2" />
              Ingest Fashion/Home
            </Button>
            <Button
              onClick={triggerRefresh}
              disabled={activeOperations.some(op => op.type === 'refresh')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Prices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Statistics */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.ingestor?.products?.total_products || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.ingestor?.products?.active_products || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.ingestor?.products?.categories || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats?.ingestor?.products?.avg_discount?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Discount</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deal Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.refresher?.deals?.active_deals || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Deals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.refresher?.deals?.total_deals || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Deals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.refresher?.deals?.avg_deal_discount?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Discount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {stats?.refresher?.deals?.max_discount?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Max Discount</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Today's Price Records</span>
                    <span>{stats?.refresher?.priceHistory?.total_records || 0}</span>
                  </div>
                  <Progress value={Math.min((stats?.refresher?.priceHistory?.total_records || 0) / 100 * 100, 100)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Products with History</span>
                    <span>{stats?.refresher?.priceHistory?.products_with_history || 0}</span>
                  </div>
                  <Progress value={Math.min((stats?.refresher?.priceHistory?.products_with_history || 0) / (stats?.ingestor?.products?.total_products || 1) * 100, 100)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AmazonDashboard;