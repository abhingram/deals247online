import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { ArrowLeft, Users, Package, UserCheck, UserX, Edit, Trash2, Crown, Shield, Upload, RotateCcw, Link, Copy, BarChart3, TrendingUp, Eye, MousePointer, Share2, Star, MessageSquare, Download, UploadCloud, DollarSign, Target, Award, CheckCircle, AlertTriangle, FileText, PieChart, Activity, Zap } from 'lucide-react';
import BulkOperations from '@/components/BulkOperations';
import AIAssistant from '@/components/AIAssistant';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('deals');
  const [users, setUsers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [deletedDeals, setDeletedDeals] = useState([]);
  const [urlShortenerInput, setUrlShortenerInput] = useState('');
  const [shortenedUrls, setShortenedUrls] = useState([]);
  const [submitDealForm, setSubmitDealForm] = useState({
    title: '',
    store: '',
    original_price: '',
    discounted_price: '',
    discount: '',
    category: '',
    image: '',
    verified: false
  });

  // Analytics state
  const [analytics, setAnalytics] = useState({
    summary: null,
    dealPerformance: [],
    userEngagement: [],
    revenue: null,
    categoryPerformance: [],
    storePerformance: []
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Business Features State
  const [affiliateLinks, setAffiliateLinks] = useState([]);
  const [commissionData, setCommissionData] = useState([]);
  const [trustIndicators, setTrustIndicators] = useState({
    verifiedDeals: 0,
    totalDeals: 0,
    userRatings: [],
    storeReliability: []
  });
  const [businessAnalytics, setBusinessAnalytics] = useState({
    revenue: null,
    commissions: null,
    conversionRates: null,
    affiliatePerformance: [],
    roi: null
  });

  console.log('AdminPanel: user:', user, 'isAdmin:', isAdmin, 'firebase_uid:', localStorage.getItem('firebase_uid'));

  const handleSubmitDealInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSubmitDealForm(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Auto-calculate discount when prices change
      if (name === 'original_price' || name === 'discounted_price') {
        const originalPrice = parseFloat(name === 'original_price' ? value : updated.original_price);
        const discountedPrice = parseFloat(name === 'discounted_price' ? value : updated.discounted_price);

        if (originalPrice > 0 && discountedPrice > 0 && discountedPrice < originalPrice) {
          const discountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
          updated.discount = discountPercent.toString();
        } else if (originalPrice > 0 && discountedPrice >= originalPrice) {
          updated.discount = '0';
        }
      }

      return updated;
    });
  };

  useEffect(() => {
    console.log('AdminPanel: useEffect triggered', { activeTab, isAdmin, analyticsLoading, analyticsSummary: analytics.summary });
    
    // Load initial data when admin panel is accessed
    if (isAdmin && categories.length === 0 && stores.length === 0 && !loadingData) {
      console.log('AdminPanel: Loading initial data...');
      loadData();
    }
    
    if (activeTab === 'analytics' && isAdmin && !analyticsLoading && !analytics.summary) {
      console.log('AdminPanel: Calling loadAnalytics');
      loadAnalytics();
    }
    if ((activeTab === 'affiliate' || activeTab === 'business-analytics') && isAdmin) {
      loadBusinessData();
    }
  }, [activeTab, isAdmin, analyticsLoading, analytics.summary]);

  const loadData = async () => {
    console.log('AdminPanel: Starting loadData...');
    setLoadingData(true);
    try {
      // Load deals, categories, and stores first (these don't require admin auth)
      console.log('AdminPanel: Loading deals, categories, stores...');
      const [dealsData, categoriesData, storesData] = await Promise.all([
        api.getDeals({ limit: 100 }).catch(error => {
          console.error('AdminPanel: Error loading deals:', error);
          return { deals: [] };
        }),
        api.getCategories().catch(error => {
          console.error('AdminPanel: Error loading categories:', error);
          return [];
        }),
        api.getStores().catch(error => {
          console.error('AdminPanel: Error loading stores:', error);
          return [];
        })
      ]);

      console.log('AdminPanel: API responses received');
      console.log('AdminPanel: dealsData:', dealsData);
      console.log('AdminPanel: dealsData.deals:', dealsData.deals);
      console.log('AdminPanel: dealsData.deals length:', dealsData.deals?.length || 0);
      console.log('AdminPanel: categoriesData:', categoriesData);
      console.log('AdminPanel: categoriesData length:', categoriesData?.length || 0);
      console.log('AdminPanel: storesData:', storesData);
      console.log('AdminPanel: storesData length:', storesData?.length || 0);

      setDeals(dealsData.deals || []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setStores(Array.isArray(storesData) ? storesData : []);

      console.log('AdminPanel: State updated with deals:', dealsData.deals?.length || 0);

      // Try to load users (this requires admin auth)
      try {
        const usersData = await api.getUsers(user.uid);
        setUsers(usersData);
        console.log('AdminPanel: Users loaded:', usersData?.length || 0);
      } catch (usersError) {
        console.error('Error loading users:', usersError);
        // Don't show error toast for users, just log it
        // Users tab will show empty or error state
      }

      // Try to load deleted deals
      try {
        const deletedDealsData = await api.getDeletedDeals(user.uid);
        setDeletedDeals(deletedDealsData.deals || []);
        console.log('AdminPanel: Deleted deals loaded:', deletedDealsData.deals?.length || 0);
      } catch (deletedError) {
        console.error('Error loading deleted deals:', deletedError);
        // Don't show error toast for deleted deals, just log it
      }

      // Try to load shortened URLs
      try {
        const shortenedUrlsData = await api.getShortenedUrls();
        if (shortenedUrlsData.success) {
          const urlsWithIds = shortenedUrlsData.data.map((url, index) => ({
            ...url,
            id: Date.now() + index // Add unique IDs for React keys
          }));
          setShortenedUrls(urlsWithIds);
          console.log('AdminPanel: Shortened URLs loaded:', urlsWithIds.length);
        }
      } catch (shortenerError) {
        console.error('Error loading shortened URLs:', shortenerError);
        // Don't show error toast for shortened URLs, just log it
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin data.',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
      console.log('AdminPanel: loadData completed');
    }
  };

  const loadAnalytics = async () => {
    console.log('AdminPanel: loadAnalytics called');
    setAnalyticsLoading(true);
    try {
      const firebaseUid = localStorage.getItem('firebase_uid');
      console.log('AdminPanel: firebase_uid from localStorage:', firebaseUid);

      const params = {};
      if (analyticsDateRange.startDate && analyticsDateRange.endDate) {
        params.startDate = analyticsDateRange.startDate;
        params.endDate = analyticsDateRange.endDate;
      }

      console.log('AdminPanel: Making API calls with params:', params);

      const [summaryRes, dealPerfRes, userEngRes, catPerfRes, storePerfRes] = await Promise.all([
        api.getAnalyticsSummary(params),
        api.getDealPerformance({ limit: 20 }),
        api.getUserEngagement(),
        api.getCategoryPerformance(),
        api.getStorePerformance()
      ]);

      console.log('AdminPanel: API calls successful');

      setAnalytics({
        summary: summaryRes,
        dealPerformance: dealPerfRes,
        userEngagement: userEngRes,
        revenue: null, // Placeholder
        categoryPerformance: catPerfRes,
        storePerformance: storePerfRes
      });
    } catch (error) {
      console.error('AdminPanel: Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data.',
        variant: 'destructive'
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadBusinessData = async () => {
    try {
      // Load affiliate data
      const [affiliateRes, commissionRes, trustRes, businessAnalyticsRes] = await Promise.all([
        api.getAffiliateLinks().catch(() => []),
        api.getCommissionData().catch(() => ({ totalEarned: 0, pending: 0, paid: 0, recent: [] })),
        api.getTrustIndicators().catch(() => ({ verifiedDeals: 0, totalDeals: 0, userRatings: [], storeReliability: [] })),
        api.getBusinessAnalytics().catch(() => ({
          revenue: { total: 0, growth: 0, avgDealValue: 0 },
          conversionRates: { overall: 0 },
          affiliatePerformance: [],
          roi: { percentage: 0 }
        }))
      ]);

      setAffiliateLinks(affiliateRes);
      setCommissionData(commissionRes);
      setTrustIndicators(trustRes);
      setBusinessAnalytics(businessAnalyticsRes);
    } catch (error) {
      console.error('Error loading business data:', error);
      // Don't show error toast for business data, just log it
    }
  };
  const handleUserRoleUpdate = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole, user.uid);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({
        title: 'Success',
        description: `User role updated to ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.deleteUser(userId, user.uid);
      setUsers(users.filter(u => u.id !== userId));
      toast({
        title: 'Success',
        description: 'User deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDeal = async (dealId) => {
    if (!confirm('Are you sure you want to delete this deal? This will hide it from all users.')) return;

    try {
      await api.deleteDeal(dealId, user.uid);
      setDeals(deals.filter(d => d.id !== dealId));
      toast({
        title: 'Success',
        description: 'Deal has been hidden from all users.',
      });
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete deal.',
        variant: 'destructive'
      });
    }
  };

  const handleEditDeal = (deal) => {
    setEditingDeal(deal);
    setDealDialogOpen(true);
  };

  const handleUpdateDeal = async (dealData) => {
    try {
      // Validation
      if (!dealData.title.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a deal title.',
          variant: 'destructive'
        });
        return;
      }

      if (!dealData.store) {
        toast({
          title: 'Validation Error',
          description: 'Please select a store.',
          variant: 'destructive'
        });
        return;
      }

      if (!dealData.category) {
        toast({
          title: 'Validation Error',
          description: 'Please select a category.',
          variant: 'destructive'
        });
        return;
      }

      const originalPrice = parseFloat(dealData.original_price);
      const discountedPrice = parseFloat(dealData.discounted_price);

      if (!originalPrice || originalPrice <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid original price.',
          variant: 'destructive'
        });
        return;
      }

      if (!discountedPrice || discountedPrice <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid discounted price.',
          variant: 'destructive'
        });
        return;
      }

      if (discountedPrice >= originalPrice) {
        toast({
          title: 'Validation Error',
          description: 'Discounted price must be less than original price.',
          variant: 'destructive'
        });
        return;
      }

      // Convert form data to proper types for API
      const apiData = {
        ...dealData,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount: parseInt(dealData.discount) || 0,
        verified: dealData.verified ? 1 : 0,
        expires_at: dealData.expires_at || null
      };

      await api.updateDeal(editingDeal.id, apiData);
      setDeals(deals.map(d => d.id === editingDeal.id ? { ...d, ...apiData } : d));
      setDealDialogOpen(false);
      setEditingDeal(null);
      toast({
        title: 'Success',
        description: 'Deal updated successfully.',
      });
    } catch (error) {
      console.error('Error updating deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to update deal.',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitDeal = async (e) => {
    e.preventDefault();

    // Validation
    if (!submitDealForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a deal title.',
        variant: 'destructive'
      });
      return;
    }

    if (!submitDealForm.store) {
      toast({
        title: 'Validation Error',
        description: 'Please select a store.',
        variant: 'destructive'
      });
      return;
    }

    if (!submitDealForm.category) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category.',
        variant: 'destructive'
      });
      return;
    }

    const originalPrice = parseFloat(submitDealForm.original_price);
    const discountedPrice = parseFloat(submitDealForm.discounted_price);

    if (!originalPrice || originalPrice <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid original price.',
        variant: 'destructive'
      });
      return;
    }

    if (!discountedPrice || discountedPrice <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid discounted price.',
        variant: 'destructive'
      });
      return;
    }

    if (discountedPrice >= originalPrice) {
      toast({
        title: 'Validation Error',
        description: 'Discounted price must be less than original price.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const dealData = {
        ...submitDealForm,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount: parseInt(submitDealForm.discount) || 0,
        rating: 0,
        reviews: 0,
        verified: submitDealForm.verified
      };

      await api.createDeal(dealData);

      // Reload deals to show the new one
      const dealsData = await api.getDeals({ limit: 100 });
      setDeals(dealsData.deals || []);

      toast({
        title: 'Success!',
        description: 'Deal has been submitted successfully.',
      });

      // Reset form
      setSubmitDealForm({
        title: '',
        store: '',
        original_price: '',
        discounted_price: '',
        discount: '',
        category: '',
        image: '',
        verified: false
      });

    } catch (error) {
      console.error('Error submitting deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit deal. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const loadDeletedDeals = async () => {
    try {
      // We'll need to add a new API endpoint for this, but for now let's use a direct query
      // For now, we'll skip this and focus on the main functionality
      console.log('Load deleted deals - to be implemented');
    } catch (error) {
      console.error('Error loading deleted deals:', error);
    }
  };

  const handleRestoreDeal = async (dealId) => {
    if (!confirm('Are you sure you want to restore this deal? It will be visible to all users again.')) return;

    try {
      await api.restoreDeal(dealId, user.uid);
      
      // Remove from deleted deals and add back to active deals
      const restoredDeal = deletedDeals.find(d => d.id === dealId);
      if (restoredDeal) {
        setDeletedDeals(deletedDeals.filter(d => d.id !== dealId));
        setDeals([...deals, { ...restoredDeal, deleted: 0, deleted_at: null }]);
      }
      
      toast({
        title: 'Success',
        description: 'Deal has been restored and is now visible to all users.',
      });
    } catch (error) {
      console.error('Error restoring deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore deal.',
        variant: 'destructive'
      });
    }
  };

  const generateShortUrl = (longUrl) => {
    // Simple URL shortening using base62 encoding of timestamp + random
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const combined = timestamp + random;
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let shortCode = '';
    
    let num = combined;
    while (num > 0) {
      shortCode = chars[num % 62] + shortCode;
      num = Math.floor(num / 62);
    }
    
    // Ensure minimum length of 6 characters
    while (shortCode.length < 6) {
      shortCode = chars[Math.floor(Math.random() * 62)] + shortCode;
    }
    
    return shortCode.substring(0, 8); // Max 8 characters
  };

  const handleShortenUrl = async () => {
    if (!urlShortenerInput.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL to shorten.',
        variant: 'destructive'
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(urlShortenerInput);
    } catch {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const shortCode = generateShortUrl(urlShortenerInput);
      const response = await api.createShortUrl(urlShortenerInput, shortCode, user?.uid);
      
      if (response.success) {
        const newShortenedUrl = {
          ...response.data
        };
        
        setShortenedUrls(prev => [newShortenedUrl, ...prev]);
        setUrlShortenerInput('');
        
        toast({
          title: 'Success',
          description: 'URL shortened successfully!',
        });
      } else {
        throw new Error(response.message || 'Failed to create short URL');
      }
    } catch (error) {
      console.error('Error shortening URL:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to shorten URL.',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'URL copied to clipboard.',
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: 'Copied!',
        description: 'URL copied to clipboard.',
      });
    }
  };

  const handleDeleteShortUrl = async (id) => {
    if (!confirm('Are you sure you want to delete this shortened URL?')) return;

    try {
      await api.deleteShortUrl(id);
      setShortenedUrls(prev => prev.filter(url => url.id !== id));
      toast({
        title: 'Success',
        description: 'Shortened URL deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting short URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete shortened URL.',
        variant: 'destructive'
      });
    }
  };

  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Deals</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Panel</h1>
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Manage users, deals, and system settings.
          </p>
        </div>

        {/* Navigation Tabs - Responsive: Dropdown on mobile, horizontal tabs on desktop */}
        
        {/* Mobile Dropdown (< md) */}
        <div className="md:hidden mb-6">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full px-4 py-3 text-base font-medium border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="analytics">📊 Analytics</option>
            <option value="users">👥 Users ({users.length})</option>
            <option value="deals">📦 Deals ({deals.length})</option>
            <option value="submit-deal">⬆️ Submit Deal</option>
            <option value="deleted-deals">🗑️ Deleted Deals ({deletedDeals.length})</option>
            <option value="url-shortener">🔗 URL Shortener</option>
            <option value="ai-assistant">💬 AI Assistant</option>
            <option value="affiliate">💰 Affiliate</option>
            <option value="bulk-ops">☁️ Bulk Ops</option>
            <option value="business-analytics">📈 Business</option>
          </select>
        </div>

        {/* Desktop Horizontal Tabs (≥ md) */}
        <div className="hidden md:flex gap-4 mb-8 border-b border-gray-200 flex-wrap">
          <button
            onClick={() => {
              console.log('Analytics tab clicked, setting activeTab to analytics');
              setActiveTab('analytics');
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('deals')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'deals'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />
            Deals ({deals.length})
          </button>
          <button
            onClick={() => setActiveTab('submit-deal')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'submit-deal'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Submit Deal
          </button>
          <button
            onClick={() => setActiveTab('deleted-deals')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'deleted-deals'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Deleted Deals ({deletedDeals.length})
          </button>
          <button
            onClick={() => setActiveTab('url-shortener')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'url-shortener'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link className="h-4 w-4 inline mr-2" />
            URL Shortener
          </button>
          <button
            onClick={() => setActiveTab('ai-assistant')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'ai-assistant'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-2" />
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('affiliate')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'affiliate'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="h-4 w-4 inline mr-2" />
            Affiliate
          </button>
          <button
            onClick={() => setActiveTab('bulk-ops')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'bulk-ops'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UploadCloud className="h-4 w-4 inline mr-2" />
            Bulk Ops
          </button>
          <button
            onClick={() => setActiveTab('business-analytics')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'business-analytics'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <PieChart className="h-4 w-4 inline mr-2" />
            Business
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Date Range Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={analyticsDateRange.startDate}
                      onChange={(e) => setAnalyticsDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={analyticsDateRange.endDate}
                      onChange={(e) => setAnalyticsDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <Button onClick={loadAnalytics} disabled={analyticsLoading}>
                    {analyticsLoading ? 'Loading...' : 'Update Analytics'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAnalyticsDateRange({ startDate: '', endDate: '' });
                      loadAnalytics();
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            {analytics.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.summary.total_users || 0}</p>
                        {analytics.summary.new_users > 0 && (
                          <p className="text-sm text-green-600">+{analytics.summary.new_users} new</p>
                        )}
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Deals</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.summary.total_deals || 0}</p>
                        <p className="text-sm text-green-600">{analytics.summary.active_deals || 0} active</p>
                      </div>
                      <Package className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Views</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.summary.total_views || 0}</p>
                        <p className="text-sm text-blue-600">{analytics.summary.total_clicks || 0} clicks</p>
                      </div>
                      <Eye className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                        <p className="text-2xl font-bold text-gray-900">{parseFloat(analytics.summary.avg_rating)?.toFixed(1) || '0.0'}</p>
                        <p className="text-sm text-orange-600">{analytics.summary.total_reviews || 0} reviews</p>
                      </div>
                      <Star className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Deal Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Performing Deals
                </CardTitle>
                <CardDescription>
                  Deals ranked by view count and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading deal performance...</p>
                  </div>
                ) : analytics.dealPerformance.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No deal performance data available</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {analytics.dealPerformance.map((deal, index) => (
                      <div key={deal.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
                        {/* Left section - Deal info */}
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                            {index + 1}
                          </div>
                          <img
                            src={deal.image || '/default-deal.png'}
                            alt={deal.title}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base line-clamp-1">{deal.title}</p>
                            <p className="text-xs sm:text-sm text-gray-500">{deal.store_name} • {deal.category_name}</p>
                            <div className="flex items-center flex-wrap gap-2 mt-1">
                              <span className="text-xs sm:text-sm text-green-600 font-medium">
                                ₹{deal.price}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                deal.status === 'expired' ? 'bg-red-100 text-red-800' :
                                deal.status === 'expiring_soon' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {deal.status === 'expired' ? 'Expired' :
                                 deal.status === 'expiring_soon' ? 'Expiring Soon' : 'Active'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right section - Stats */}
                        <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-4 lg:gap-6 text-xs sm:text-sm border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{deal.total_views || 0}</p>
                            <p className="text-gray-500 text-xs">Views</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{deal.total_clicks || 0}</p>
                            <p className="text-gray-500 text-xs">Clicks</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{deal.total_shares || 0}</p>
                            <p className="text-gray-500 text-xs">Shares</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900 flex items-center justify-center gap-1">
                              <Star className="h-3 w-3" />
                              {parseFloat(deal.avg_rating)?.toFixed(1) || '0.0'}
                            </p>
                            <p className="text-gray-500 text-xs">{deal.total_reviews || 0} reviews</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Engagement
                </CardTitle>
                <CardDescription>
                  User activity and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading user engagement data...</p>
                  </div>
                ) : analytics.userEngagement.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No user engagement data available</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {analytics.userEngagement.slice(0, 10).map((user) => (
                      <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
                        {/* Left section - User info */}
                        <div className="flex items-center gap-3 sm:gap-4">
                          <img
                            src={user.photo_url || '/default-avatar.png'}
                            alt={user.display_name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{user.display_name || 'No name'}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</p>
                            <p className="text-xs text-gray-400">
                              Last active: {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'Never'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Right section - Stats */}
                        <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-4 lg:gap-6 text-xs sm:text-sm border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{user.total_views || 0}</p>
                            <p className="text-gray-500 text-xs">Views</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{user.total_clicks || 0}</p>
                            <p className="text-gray-500 text-xs">Clicks</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{user.total_favorites || 0}</p>
                            <p className="text-gray-500 text-xs">Favorites</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{user.unique_deals_viewed || 0}</p>
                            <p className="text-gray-500 text-xs">Viewed</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Performance
                </CardTitle>
                <CardDescription>
                  Performance metrics by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading category performance...</p>
                  </div>
                ) : analytics.categoryPerformance.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No category performance data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.categoryPerformance.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <p className="font-medium text-gray-900">{category.name}</p>
                            <p className="text-sm text-gray-500">Level {category.level}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{category.total_deals || 0}</p>
                            <p className="text-gray-500">Deals</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{category.total_views || 0}</p>
                            <p className="text-gray-500">Views</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{category.total_clicks || 0}</p>
                            <p className="text-gray-500">Clicks</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{parseFloat(category.avg_rating)?.toFixed(1) || '0.0'}</p>
                            <p className="text-gray-500">Avg Rating</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View and manage all registered users and their roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg">No users found or failed to load users.</p>
                    <p className="text-gray-400 text-sm mt-2">You may not have permission to view users.</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
                        {/* User info */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <img
                            src={user.photo_url || '/default-avatar.png'}
                            alt={user.display_name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{user.display_name || 'No name'}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</p>
                            <div className="mt-1">
                              {user.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                                  <Crown className="h-3 w-3" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  <UserCheck className="h-3 w-3" />
                                  User
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Controls */}
                        <div className="flex items-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleUserRoleUpdate(user.id, value)}
                          >
                            <SelectTrigger className="w-full sm:w-32 min-h-[44px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          {user.role !== 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 min-w-[44px] min-h-[44px]"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Deal Management
                </CardTitle>
                <CardDescription>
                  View, edit, and hide existing deals. Hidden deals are removed from public view. Total deals: {deals.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading deals...</p>
                  </div>
                ) : deals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg">No deals found.</p>
                    <p className="text-gray-400 text-sm mt-2">Deals array length: {deals.length}</p>
                    <p className="text-gray-400 text-sm mt-2">Loading state: {loadingData ? 'true' : 'false'}</p>
                    <button
                      onClick={() => loadData()}
                      className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      Retry Loading Deals
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {deals.map((deal) => (
                      <div key={deal.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
                        {/* Deal info */}
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <img
                            src={deal.image || '/default-deal.png'}
                            alt={deal.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2">{deal.title}</p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">{deal.store} • {deal.category}</p>
                            <p className="text-sm font-medium text-green-600 mt-1">
                              ₹{deal.discounted_price} <span className="text-gray-400 line-through">₹{deal.original_price}</span>
                              <span className="text-orange-600 ml-2">({deal.discount}% off)</span>
                            </p>
                          </div>
                        </div>
                        
                        {/* Controls */}
                        <div className="flex items-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDeal(deal)}
                            className="flex-1 sm:flex-none min-h-[44px] min-w-[44px]"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="ml-2 sm:hidden">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDeal(deal.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none min-h-[44px] min-w-[44px]"
                            title="Hide this deal from all users"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2 sm:hidden">Hide</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submit Deal Tab */}
        {activeTab === 'submit-deal' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Submit New Deal
                </CardTitle>
                <CardDescription>
                  Add a new deal to the platform. As an admin, you can mark deals as verified.
                </CardDescription>
                {/* Debug info */}
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                  <p>Categories loaded: {categories.length}</p>
                  <p>Stores loaded: {stores.length}</p>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitDeal} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label htmlFor="title">Deal Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        type="text"
                        placeholder="e.g., Apple iPhone 15 Pro Max - 256GB"
                        value={submitDealForm.title}
                        onChange={handleSubmitDealInputChange}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="store">Store *</Label>
                      <select
                        id="store"
                        name="store"
                        value={submitDealForm.store}
                        onChange={handleSubmitDealInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      >
                        <option value="">Select a store</option>
                        {stores.map(store => (
                          <option key={store.id} value={store.name}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <select
                        id="category"
                        name="category"
                        value={submitDealForm.category}
                        onChange={handleSubmitDealInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="original_price">Original Price ($) *</Label>
                      <Input
                        id="original_price"
                        name="original_price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={submitDealForm.original_price}
                        onChange={handleSubmitDealInputChange}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="discounted_price">Discounted Price ($) *</Label>
                      <Input
                        id="discounted_price"
                        name="discounted_price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={submitDealForm.discounted_price}
                        onChange={handleSubmitDealInputChange}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="discount">Discount (%)</Label>
                      <Input
                        id="discount"
                        name="discount"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Auto-calculated"
                        value={submitDealForm.discount}
                        onChange={handleSubmitDealInputChange}
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Automatically calculated from prices
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
                      <Input
                        id="expires_at"
                        name="expires_at"
                        type="datetime-local"
                        value={submitDealForm.expires_at}
                        onChange={handleSubmitDealInputChange}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="image">Image URL (Optional)</Label>
                      <Input
                        id="image"
                        name="image"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={submitDealForm.image}
                        onChange={handleSubmitDealInputChange}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Provide a direct link to the product image
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="verified"
                        name="verified"
                        checked={submitDealForm.verified}
                        onChange={handleSubmitDealInputChange}
                        className="rounded"
                      />
                      <Label htmlFor="verified">Mark as Verified Deal</Label>
                      <p className="text-xs text-gray-500 ml-2">
                        Verified deals appear with a special badge
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
                    >
                      Submit Deal
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deleted Deals Tab */}
        {activeTab === 'deleted-deals' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Deleted Deals
                </CardTitle>
                <CardDescription>
                  View and restore previously deleted deals. Total deleted deals: {deletedDeals.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading deleted deals...</p>
                  </div>
                ) : deletedDeals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg">No deleted deals found.</p>
                    <p className="text-gray-400 text-sm mt-2">Deleted deals will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deletedDeals.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center gap-4">
                          <img
                            src={deal.image || '/default-deal.png'}
                            alt={deal.title}
                            className="w-12 h-12 rounded-lg object-cover opacity-50"
                          />
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{deal.title}</p>
                            <p className="text-sm text-gray-500">{deal.store} • {deal.category}</p>
                            <p className="text-sm font-medium text-green-600">
                              ₹{deal.discounted_price} <span className="text-gray-400 line-through">₹{deal.original_price}</span>
                              <span className="text-orange-600 ml-2">({deal.discount}% off)</span>
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              Deleted: {deal.deleted_at ? new Date(deal.deleted_at).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreDeal(deal.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Restore this deal to make it visible to all users"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* URL Shortener Tab */}
        {activeTab === 'url-shortener' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  URL Shortener
                </CardTitle>
                <CardDescription>
                  Create short URLs for easy sharing. Generated URLs will be in the format: {window.location.origin}/s/[short-code]
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* URL Input Section */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="long-url">Long URL</Label>
                      <Input
                        id="long-url"
                        type="url"
                        placeholder="https://example.com/very/long/url/that/needs/shortening"
                        value={urlShortenerInput}
                        onChange={(e) => setUrlShortenerInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleShortenUrl()}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleShortenUrl}
                        className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
                      >
                        Shorten URL
                      </Button>
                    </div>
                  </div>

                  {/* Generated URLs Section */}
                  {shortenedUrls.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Generated URLs</h3>
                      <div className="space-y-3">
                        {shortenedUrls.map((url) => (
                          <div key={url.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="space-y-3">
                              {/* Short URL */}
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Short URL:</p>
                                  <p className="text-sm font-mono bg-white px-3 py-2 rounded border break-all">
                                    {url.shortUrl}
                                  </p>
                                </div>
                                <div className="flex gap-2 ml-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(url.shortUrl)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteShortUrl(url.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Long URL */}
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Original URL:</p>
                                  <p className="text-sm font-mono bg-white px-3 py-2 rounded border break-all">
                                    {url.longUrl}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(url.longUrl)}
                                  className="ml-3 flex-shrink-0"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Metadata */}
                              <div className="text-xs text-gray-500 pt-2 border-t flex justify-between items-center">
                                <div>
                                  Created: {new Date(url.createdAt).toLocaleString()}
                                  {url.clicks !== undefined && (
                                    <span className="ml-4">Clicks: {url.clicks}</span>
                                  )}
                                </div>
                                {url.createdBy && (
                                  <span className="text-xs text-gray-400">
                                    By: {url.createdBy === user?.uid ? 'You' : 'Admin'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {shortenedUrls.length === 0 && (
                    <div className="text-center py-12">
                      <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No shortened URLs yet</p>
                      <p className="text-gray-400 text-sm mt-2">Enter a URL above to create your first short link</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai-assistant' && (
          <div className="space-y-6">
            <AIAssistant
              analytics={analytics}
              users={users}
              deals={deals}
              categories={categories}
              stores={stores}
              onExecuteAction={(action, params) => {
                // Handle AI-suggested actions
                console.log('AI Action:', action, params);
                // You can implement action execution here
              }}
            />
          </div>
        )}

        {/* Affiliate Management Tab */}
        {activeTab === 'affiliate' && (
          <div className="space-y-6">
            {/* Affiliate Links Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Affiliate Link Management
                </CardTitle>
                <CardDescription>
                  Track and manage affiliate links, clicks, and commissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Add New Affiliate Link */}
                  <div className="flex gap-4">
                    <Input
                      placeholder="Affiliate Link URL"
                      className="flex-1"
                    />
                    <Input
                      placeholder="Commission Rate (%)"
                      type="number"
                      className="w-32"
                    />
                    <Button className="bg-gradient-to-r from-orange-500 to-pink-600">
                      Add Link
                    </Button>
                  </div>

                  {/* Affiliate Links Table */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-4 font-medium text-gray-700 border-b pb-2">
                      <div className="col-span-4">URL</div>
                      <div className="col-span-2">Clicks</div>
                      <div className="col-span-2">Conversions</div>
                      <div className="col-span-2">Commission</div>
                      <div className="col-span-2">Actions</div>
                    </div>
                    {affiliateLinks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No affiliate links configured yet
                      </div>
                    ) : (
                      affiliateLinks.map((link) => (
                        <div key={link.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b">
                          <div className="col-span-4 truncate text-sm">{link.url}</div>
                          <div className="col-span-2 text-center">{link.clicks || 0}</div>
                          <div className="col-span-2 text-center">{link.conversions || 0}</div>
                          <div className="col-span-2 text-center">₹{link.commission?.toFixed(2) || '0.00'}</div>
                          <div className="col-span-2 flex gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm" className="text-red-600">Delete</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commission Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Commission Management
                </CardTitle>
                <CardDescription>
                  Track commission earnings and payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">₹{commissionData.totalEarned || '0.00'}</p>
                    <p className="text-sm text-gray-600">Total Earned</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">₹{commissionData.pending || '0.00'}</p>
                    <p className="text-sm text-gray-600">Pending Payout</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">₹{commissionData.paid || '0.00'}</p>
                    <p className="text-sm text-gray-600">Paid Out</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Recent Commissions</h3>
                  {commissionData.recent?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No commission data available
                    </div>
                  ) : (
                    commissionData.recent?.map((commission) => (
                      <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{commission.dealTitle}</p>
                          <p className="text-sm text-gray-600">{commission.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">${commission.amount}</p>
                          <p className={`text-sm ${commission.status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                            {commission.status}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Operations Tab */}
        {activeTab === 'bulk-ops' && (
          <BulkOperations />
        )}

        {/* Business Analytics Tab */}
        {activeTab === 'business-analytics' && (
          <div className="space-y-6">
            {/* Business Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-2xl font-bold text-green-600">₹{businessAnalytics.revenue?.total || '0.00'}</p>
                      <p className="text-sm text-green-600">+{businessAnalytics.revenue?.growth || '0'}%</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                      <p className="text-2xl font-bold text-blue-600">{businessAnalytics.conversionRates?.overall || '0'}%</p>
                      <p className="text-sm text-blue-600">Click to Purchase</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Deal Value</p>
                      <p className="text-2xl font-bold text-purple-600">₹{businessAnalytics.revenue?.avgDealValue || '0.00'}</p>
                      <p className="text-sm text-purple-600">Per transaction</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">ROI</p>
                      <p className="text-2xl font-bold text-orange-600">{businessAnalytics.roi?.percentage || '0'}%</p>
                      <p className="text-sm text-orange-600">Return on investment</p>
                    </div>
                    <Activity className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trust Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Trust & Verification Metrics
                </CardTitle>
                <CardDescription>
                  Deal verification status and user trust indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{trustIndicators.verifiedDeals}</p>
                    <p className="text-sm text-gray-600">Verified Deals</p>
                    <p className="text-xs text-gray-500">
                      {trustIndicators.totalDeals > 0 ? Math.round((trustIndicators.verifiedDeals / trustIndicators.totalDeals) * 100) : 0}% of total
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Star className="h-8 w-8 text-yellow-500" />
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {trustIndicators.userRatings?.length > 0
                        ? (trustIndicators.userRatings.reduce((a, b) => a + b, 0) / trustIndicators.userRatings.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                    <p className="text-sm text-gray-600">Avg User Rating</p>
                    <p className="text-xs text-gray-500">Based on {trustIndicators.userRatings?.length || 0} reviews</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {trustIndicators.storeReliability?.filter(store => store.reliability < 70).length || 0}
                    </p>
                    <p className="text-sm text-gray-600">Low Trust Stores</p>
                    <p className="text-xs text-gray-500">Need attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Affiliate Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Affiliate Performance
                </CardTitle>
                <CardDescription>
                  Top performing affiliate links and commission earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {businessAnalytics.affiliatePerformance?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No affiliate performance data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {businessAnalytics.affiliatePerformance?.map((affiliate, index) => (
                      <div key={affiliate.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-xs">{affiliate.url}</p>
                            <p className="text-sm text-gray-500">{affiliate.network}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{affiliate.clicks || 0}</p>
                            <p className="text-gray-500">Clicks</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900">{affiliate.conversions || 0}</p>
                            <p className="text-gray-500">Conversions</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-900 text-green-600">₹{affiliate.commission || '0.00'}</p>
                            <p className="text-gray-500">Commission</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Deal</DialogTitle>
              <DialogDescription>
                Update the deal information below.
              </DialogDescription>
            </DialogHeader>
            {editingDeal && (
              <EditDealForm
                deal={editingDeal}
                categories={categories}
                stores={stores}
                onSubmit={handleUpdateDeal}
                onCancel={() => setDealDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Edit Deal Form Component
const EditDealForm = ({ deal, categories, stores, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: deal.title || '',
    store: deal.store || '',
    original_price: deal.original_price?.toString() || '',
    discounted_price: deal.discounted_price?.toString() || '',
    discount: deal.discount?.toString() || '',
    category: deal.category || '',
    image: deal.image || '',
    expires_at: deal.expires_at ? new Date(deal.expires_at).toISOString().slice(0, 16) : '',
    verified: Boolean(deal.verified)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Auto-calculate discount when prices change
      if (name === 'original_price' || name === 'discounted_price') {
        const originalPrice = parseFloat(name === 'original_price' ? value : updated.original_price);
        const discountedPrice = parseFloat(name === 'discounted_price' ? value : updated.discounted_price);

        if (originalPrice > 0 && discountedPrice > 0 && discountedPrice < originalPrice) {
          const discountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
          updated.discount = discountPercent.toString();
        } else if (originalPrice > 0 && discountedPrice >= originalPrice) {
          updated.discount = '0';
        }
      }

      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="store">Store</Label>
          <select
            id="store"
            name="store"
            value={formData.store}
            onChange={handleInputChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select store</option>
            {stores.map(store => (
              <option key={store.id} value={store.name}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select category</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="original_price">Original Price</Label>
          <Input
            id="original_price"
            name="original_price"
            type="number"
            step="0.01"
            value={formData.original_price}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="discounted_price">Discounted Price</Label>
          <Input
            id="discounted_price"
            name="discounted_price"
            type="number"
            step="0.01"
            value={formData.discounted_price}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="discount">Discount (%)</Label>
          <Input
            id="discount"
            name="discount"
            type="number"
            value={formData.discount}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="expires_at">Expiration Date</Label>
          <Input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            value={formData.expires_at}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label htmlFor="image">Image URL</Label>
          <Input
            id="image"
            name="image"
            type="url"
            value={formData.image}
            onChange={handleInputChange}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="verified"
            name="verified"
            checked={formData.verified}
            onChange={handleInputChange}
            className="rounded"
          />
          <Label htmlFor="verified">Verified Deal</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Deal
        </Button>
      </DialogFooter>
    </form>
  );
};

export default AdminPanel;