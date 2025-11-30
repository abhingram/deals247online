import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  List,
  Grid3X3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Link,
  Package,
  Shield,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { api } from '../lib/api';
import DealCard from '@/components/DealCard';
import DealModal from '@/components/DealModal';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('deal');
  const [deals, setDeals] = useState([]);
  const [deletedDeals, setDeletedDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletedLoading, setDeletedLoading] = useState(true);
  const [dealViewMode, setDealViewMode] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem('adminDealViewMode') || 'list';
  });
  const [deletedDealViewMode, setDeletedDealViewMode] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem('adminDeletedDealViewMode') || 'list';
  });
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalDeals: 0,
    activeDeals: 0,
    totalUsers: 0,
    totalRevenue: 0,
    topStores: [],
    recentActivity: []
  });

  useEffect(() => {
    if (activeTab === 'deal') {
      fetchDeals();
    } else if (activeTab === 'deleted') {
      fetchDeletedDeals();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  // Save view mode preferences
  useEffect(() => {
    localStorage.setItem('adminDealViewMode', dealViewMode);
  }, [dealViewMode]);

  useEffect(() => {
    localStorage.setItem('adminDeletedDealViewMode', deletedDealViewMode);
  }, [deletedDealViewMode]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const response = await api.getDeals({ limit: 100 });
      const transformedDeals = response.deals.map(deal => ({
        id: deal.id,
        title: deal.title,
        store: deal.store,
        originalPrice: parseFloat(deal.original_price),
        discountedPrice: parseFloat(deal.discounted_price),
        discount: deal.discount,
        rating: parseFloat(deal.rating),
        reviews: deal.reviews,
        image: deal.image,
        category: deal.category,
        expiresIn: calculateExpiresIn(deal.expires_at),
        verified: Boolean(deal.verified),
      }));
      setDeals(transformedDeals);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast({
        title: "Error",
        description: "Failed to load deals.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedDeals = async () => {
    try {
      setDeletedLoading(true);
      // Assuming there's an API endpoint for deleted deals
      const response = await api.getDeletedDeals('admin_firebase_uid'); // Replace with actual admin UID
      const transformedDeals = response.deals.map(deal => ({
        id: deal.id,
        title: deal.title,
        store: deal.store,
        originalPrice: parseFloat(deal.original_price),
        discountedPrice: parseFloat(deal.discounted_price),
        discount: deal.discount,
        rating: parseFloat(deal.rating),
        reviews: deal.reviews,
        image: deal.image,
        category: deal.category,
        expiresIn: 'Deleted',
        verified: Boolean(deal.verified),
        deletedAt: deal.deleted_at,
      }));
      setDeletedDeals(transformedDeals);
    } catch (error) {
      console.error('Error fetching deleted deals:', error);
      toast({
        title: "Error",
        description: "Failed to load deleted deals.",
        variant: "destructive",
      });
    } finally {
      setDeletedLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // This would integrate with the analytics API we created
      const analyticsData = await api.getAnalytics();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Mock data for now
      setAnalytics({
        totalDeals: deals.length,
        activeDeals: deals.filter(d => d.expiresIn !== 'Expired').length,
        totalUsers: 1250,
        totalRevenue: 45280,
        topStores: ['Amazon', 'Best Buy', 'Walmart', 'Target'],
        recentActivity: []
      });
    }
  };

  const calculateExpiresIn = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  const handleEditDeal = (deal) => {
    setSelectedDeal(deal);
    setDealModalOpen(true);
  };

  const handleDeleteDeal = async (dealId) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      await api.deleteDeal(dealId);
      setDeals(deals.filter(deal => deal.id !== dealId));
      toast({
        title: "Success",
        description: "Deal deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete deal.",
        variant: "destructive",
      });
    }
  };

  const handleRestoreDeal = async (dealId) => {
    if (!confirm('Are you sure you want to restore this deal?')) return;

    try {
      await api.restoreDeal(dealId, 'admin_firebase_uid'); // Replace with actual admin UID
      setDeletedDeals(deletedDeals.filter(deal => deal.id !== dealId));
      // Refresh active deals
      fetchDeals();
      toast({
        title: "Success",
        description: "Deal restored successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore deal.",
        variant: "destructive",
      });
    }
  };

  const toggleDealVisibility = async (dealId, currentVisibility) => {
    try {
      await api.updateDeal(dealId, { visible: !currentVisibility });
      setDeals(deals.map(deal =>
        deal.id === dealId ? { ...deal, visible: !currentVisibility } : deal
      ));
      toast({
        title: "Success",
        description: `Deal ${!currentVisibility ? 'shown' : 'hidden'} successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update deal visibility.",
        variant: "destructive",
      });
    }
  };

  const renderDealListView = () => (
    <div className="space-y-4">
      {deals.map((deal) => (
        <motion.div
          key={deal.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <img
                src={deal.image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
                alt={deal.title}
                className="w-16 h-16 object-cover rounded-md"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 truncate">{deal.title}</h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{deal.store}</span>
                  <span className="text-green-600 font-semibold">↓{deal.discount}%</span>
                  <span className="font-bold text-black">${deal.discountedPrice}</span>
                  <span className="line-through">${deal.originalPrice}</span>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                    <span>{deal.rating}</span>
                    <span className="ml-1">({deal.reviews})</span>
                  </div>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {deal.expiresIn}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {deal.verified ? (
                    <div className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </div>
                  ) : (
                    <div className="flex items-center bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Unverified
                    </div>
                  )}
                  <span className="text-xs text-gray-500">ID: {deal.id}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleDealVisibility(deal.id, deal.visible !== false)}
              >
                {deal.visible !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditDeal(deal)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteDeal(deal.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderDealCardView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {deals.map((deal, index) => (
        <motion.div
          key={deal.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          className="relative"
        >
          <DealCard deal={deal} />
          {/* Admin overlay */}
          <div className="absolute top-2 right-2 flex gap-1 bg-white rounded-md shadow-sm p-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDealVisibility(deal.id, deal.visible !== false);
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title={deal.visible !== false ? 'Hide deal' : 'Show deal'}
            >
              {deal.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditDeal(deal);
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Edit deal"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteDeal(deal.id);
              }}
              className="p-1.5 rounded hover:bg-gray-100 text-red-600 hover:bg-red-50 transition-colors"
              title="Delete deal"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderDeletedDealListView = () => (
    <div className="space-y-4">
      {deletedDeals.map((deal) => (
        <motion.div
          key={deal.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow opacity-75"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <img
                src={deal.image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
                alt={deal.title}
                className="w-16 h-16 object-cover rounded-md opacity-60"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 truncate">{deal.title}</h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{deal.store}</span>
                  <span className="text-green-600 font-semibold">↓{deal.discount}%</span>
                  <span className="font-bold text-black">${deal.discountedPrice}</span>
                  <span className="line-through">${deal.originalPrice}</span>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                    <span>{deal.rating}</span>
                    <span className="ml-1">({deal.reviews})</span>
                  </div>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {deal.expiresIn}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {deal.verified ? (
                    <div className="flex items-center bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      <span className="font-medium">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded-full text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      <span className="font-medium">Unverified</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500">ID: {deal.id}</span>
                  <span className="text-xs text-red-500">Deleted: {new Date(deal.deletedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestoreDeal(deal.id)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                Restore
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderDeletedDealCardView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {deletedDeals.map((deal, index) => (
        <motion.div
          key={deal.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          className="relative opacity-75"
        >
          <DealCard deal={deal} />
          {/* Admin overlay for deleted deals */}
          <div className="absolute top-2 right-2 flex gap-1 bg-white rounded-md shadow-sm p-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRestoreDeal(deal.id);
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors text-green-600"
              title="Restore deal"
            >
              <CheckCircle className="h-3 w-3" />
            </button>
          </div>
          {/* Deleted overlay */}
          <div className="absolute inset-0 bg-red-500 bg-opacity-10 rounded-lg flex items-center justify-center">
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              Deleted {new Date(deal.deletedAt).toLocaleDateString()}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const tabs = [
    { id: 'deal', label: 'Active Deals', icon: ShoppingBag },
    { id: 'deleted', label: 'Deleted Deals', icon: Trash2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'affiliates', label: 'Affiliate Links', icon: Link },
    { id: 'bulk', label: 'Bulk Operations', icon: Package },
    { id: 'trust', label: 'Trust Indicators', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage deals, analytics, and platform settings</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Active Deals Tab */}
        {activeTab === 'deal' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Active Deals</h2>
              <div className="flex items-center space-x-4">
                {/* View Toggle */}
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setDealViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      dealViewMode === 'list'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDealViewMode('card')}
                    className={`p-2 rounded-md transition-colors ${
                      dealViewMode === 'card'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Card view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deal
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-md"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : deals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No active deals found</p>
                <Button className="mt-4 bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Deal
                </Button>
              </div>
            ) : (
              dealViewMode === 'list' ? renderDealListView() : renderDealCardView()
            )}
          </div>
        )}

        {/* Deleted Deals Tab */}
        {activeTab === 'deleted' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Deleted Deals</h2>
              <div className="flex items-center space-x-4">
                {/* View Toggle */}
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setDeletedDealViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      deletedDealViewMode === 'list'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletedDealViewMode('card')}
                    className={`p-2 rounded-md transition-colors ${
                      deletedDealViewMode === 'card'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Card view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {deletedLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-md"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : deletedDeals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No deleted deals found</p>
              </div>
            ) : (
              deletedDealViewMode === 'list' ? renderDeletedDealListView() : renderDeletedDealCardView()
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Deals</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalDeals}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Deals</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.activeDeals}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${analytics.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Charts and additional analytics would go here */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Stores</h3>
              <div className="space-y-3">
                {analytics.topStores.map((store, index) => (
                  <div key={store} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Award className="h-5 w-5 text-yellow-500 mr-3" />
                      <span className="font-medium">{store}</span>
                    </div>
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Placeholder tabs for other features */}
        {activeTab === 'affiliates' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Affiliate Link Management</h2>
            <p className="text-gray-600">Affiliate link management interface would go here.</p>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Bulk Operations</h2>
            <p className="text-gray-600">Bulk operations interface would go here.</p>
          </div>
        )}

        {activeTab === 'trust' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Trust Indicators</h2>
            <p className="text-gray-600">Trust indicators management interface would go here.</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Settings</h2>
            <p className="text-gray-600">Platform settings interface would go here.</p>
          </div>
        )}
      </div>

      {/* Deal Modal */}
      {dealModalOpen && (
        <DealModal
          deal={selectedDeal}
          open={dealModalOpen}
          onOpenChange={setDealModalOpen}
          isAdmin={true}
          onSave={() => {
            fetchDeals(); // Refresh active deals after save
            if (activeTab === 'deleted') {
              fetchDeletedDeals(); // Also refresh deleted deals if we're on that tab
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;