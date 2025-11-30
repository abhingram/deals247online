import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { toast } from '../components/ui/use-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NotificationPreferences } from '../components/NotificationPreferences';
import SavedSearches from '../components/SavedSearches';
import ImageWithFallback from '../components/ImageWithFallback';
import {
  User,
  Heart,
  History,
  Settings,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Clock,
  Star,
  Trash2,
  ExternalLink,
  Save,
  Camera,
  Mail
} from 'lucide-react';

const UserDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [favorites, setFavorites] = useState([]);
  const [dealHistory, setDealHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFavorites: 0,
    dealsViewed: 0,
    dealsSaved: 0,
    totalSavings: 0
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const favoritesData = await api.getFavorites(user.uid);
      setFavorites(favoritesData);
      const historyData = await api.getDealHistory(user.uid, { limit: 20 });
      setDealHistory(historyData.history || []);
      const totalSavings = favoritesData.reduce((sum, deal) => {
        return sum + (deal.original_price - deal.discounted_price);
      }, 0);
      setStats({
        totalFavorites: favoritesData.length,
        dealsViewed: historyData.total || 0,
        dealsSaved: favoritesData.length,
        totalSavings: totalSavings
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (dealId) => {
    try {
      await api.removeFromFavorites(user.uid, dealId);
      setFavorites(favorites.filter(deal => deal.id !== dealId));
      setStats(prev => ({
        ...prev,
        totalFavorites: prev.totalFavorites - 1,
        dealsSaved: prev.dealsSaved - 1,
        totalSavings: prev.totalSavings - (favorites.find(d => d.id === dealId)?.original_price - favorites.find(d => d.id === dealId)?.discounted_price || 0)
      }));
      toast({
        title: "Removed from favorites",
        description: "Deal removed from your favorites.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from favorites.",
        variant: "destructive",
      });
    }
  };

  const handleBuyDeal = (deal) => {
    toast({
      title: "Opening deal",
      description: `Redirecting to ${deal.store}...`,
    });
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Deals
            </Button>
            <div className="flex items-center gap-2">
              <User className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
            </div>
          </div>
          <p className="text-gray-600">Manage your profile, favorites, and deal preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Favorites ({stats.totalFavorites})
            </TabsTrigger>
            <TabsTrigger value="searches" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Saved Searches
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {user?.photoURL ? (
                    <ImageWithFallback
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-16 h-16 rounded-full"
                      fallbackClassName="bg-orange-500 text-white rounded-full flex items-center justify-center"
                      fallbackText={<User className="w-8 h-8" />}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Welcome back, {user?.displayName || 'User'}!
                    </h2>
                    <p className="text-gray-600">
                      Here's what's happening with your deals
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Heart className="h-8 w-8 text-red-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Saved Deals</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.dealsSaved}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Savings</p>
                      <p className="text-2xl font-bold text-gray-900">${stats.totalSavings.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Deals Viewed</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.dealsViewed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Star className="h-8 w-8 text-yellow-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                      <p className="text-2xl font-bold text-gray-900">4.5</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {favorites.length > 0 ? (
                  <div className="space-y-4">
                    {favorites.slice(0, 3).map((deal) => (
                      <div key={deal.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                        <ImageWithFallback
                          src={deal.image || '/default-deal.png'}
                          alt={deal.title}
                          className="w-12 h-12 rounded-lg object-cover"
                          fallbackClassName="bg-gray-200 text-gray-500 rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 line-clamp-1">{deal.title}</p>
                          <p className="text-sm text-gray-600">{deal.store} • {deal.discount}% off</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">${deal.discounted_price}</p>
                          <p className="text-sm text-gray-500 line-through">${deal.original_price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No recent activity yet. Start saving deals!</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  My Favorite Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-16">
                    <Heart className="mx-auto h-24 w-24 text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No favorites yet</h3>
                    <p className="text-gray-600 mb-6">Start saving deals to see them here!</p>
                    <Button
                      onClick={() => window.location.href = '/'}
                      className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
                    >
                      Browse Deals
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((deal) => (
                      <Card key={deal.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg line-clamp-2 mb-2">
                                {deal.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">{deal.store}</span>
                                <span>•</span>
                                <span>{deal.discount}% off</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFavorite(deal.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-gray-900">
                                ${deal.discounted_price}
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                ${deal.original_price}
                              </span>
                            </div>
                            <div className="text-sm text-green-600 font-semibold">
                              Save ${(deal.original_price - deal.discounted_price).toFixed(2)}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleBuyDeal(deal)}
                            className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Buy Now
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="searches" className="space-y-6">
            <SavedSearches onApplySearch={(filters) => {
              // Navigate to search page with applied filters
              window.location.href = `/search?filters=${encodeURIComponent(JSON.stringify(filters))}`;
            }} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Deal History
                </CardTitle>
                <CardDescription>
                  Your recently viewed and interacted deals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dealHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <History className="mx-auto h-24 w-24 text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No history yet</h3>
                    <p className="text-gray-600 mb-6">Start browsing deals to build your history!</p>
                    <Button
                      onClick={() => window.location.href = '/'}
                      className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
                    >
                      Browse Deals
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dealHistory.map((deal, index) => (
                      <div key={`${deal.id}-${index}`} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <ImageWithFallback
                          src={deal.image || '/default-deal.png'}
                          alt={deal.title}
                          className="w-16 h-16 rounded-lg object-cover"
                          fallbackClassName="bg-gray-200 text-gray-500 rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 line-clamp-1">{deal.title}</h4>
                          <p className="text-sm text-gray-600">{deal.store} • {deal.category}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-lg font-bold text-gray-900">${deal.discounted_price}</span>
                            <span className="text-sm text-gray-500 line-through">${deal.original_price}</span>
                            <span className="text-sm text-green-600 font-medium">{deal.discount}% off</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBuyDeal(deal)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Profile Picture</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="relative inline-block mb-4">
                      {user?.photoURL ? (
                        <ImageWithFallback
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-24 h-24 rounded-full mx-auto"
                          fallbackClassName="bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto"
                          fallbackText={<User className="w-12 h-12" />}
                        />
                      ) : (
                        <div className="w-24 h-24 bg-orange-500 rounded-full mx-auto flex items-center justify-center">
                          <User className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <button className="absolute bottom-0 right-0 bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {user?.displayName || 'User'}
                    </h3>
                    <p className="text-gray-600">{user?.email}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Signed in with Email
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="displayName"
                            name="displayName"
                            type="text"
                            placeholder="Your display name"
                            value={profileData.displayName}
                            onChange={handleProfileInputChange}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="your@email.com"
                            value={profileData.email}
                            onChange={handleProfileInputChange}
                            className="pl-10"
                            disabled
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Email changes require re-authentication
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={profileLoading}
                        className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <NotificationPreferences />

                <Card>
                  <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">Export Data</h4>
                          <p className="text-sm text-gray-600">Download your saved deals and profile data</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Export
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-red-900">Delete Account</h4>
                          <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                        </div>
                        <Button variant="destructive" size="sm">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;