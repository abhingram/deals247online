const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = {
  // Deals endpoints
  getDeals: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/deals${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch deals');
    return response.json();
  },

  getDeal: async (id) => {
    const response = await fetch(`${API_BASE_URL}/deals/${id}`);
    if (!response.ok) throw new Error('Failed to fetch deal');
    return response.json();
  },

  createDeal: async (dealData) => {
    const response = await fetch(`${API_BASE_URL}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dealData),
    });
    if (!response.ok) throw new Error('Failed to create deal');
    return response.json();
  },

  updateDeal: async (id, dealData) => {
    const response = await fetch(`${API_BASE_URL}/deals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dealData),
    });
    if (!response.ok) throw new Error('Failed to update deal');
    return response.json();
  },

  deleteDeal: async (id, adminFirebaseUid) => {
    const response = await fetch(`${API_BASE_URL}/deals/${id}?firebase_uid=${adminFirebaseUid}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete deal');
    return response.json();
  },

  restoreDeal: async (id, adminFirebaseUid) => {
    const response = await fetch(`${API_BASE_URL}/deals/${id}/restore?firebase_uid=${adminFirebaseUid}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to restore deal');
    return response.json();
  },

  getDeletedDeals: async (adminFirebaseUid) => {
    const response = await fetch(`${API_BASE_URL}/deals/admin/deleted?firebase_uid=${adminFirebaseUid}`);
    if (!response.ok) throw new Error('Failed to fetch deleted deals');
    return response.json();
  },

  restoreDeal: async (id, adminFirebaseUid) => {
    const response = await fetch(`${API_BASE_URL}/deals/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebase_uid: adminFirebaseUid }),
    });
    if (!response.ok) throw new Error('Failed to restore deal');
    return response.json();
  },

  // Categories endpoints
  getCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  // Stores endpoints
  getStores: async () => {
    const response = await fetch(`${API_BASE_URL}/stores`);
    if (!response.ok) throw new Error('Failed to fetch stores');
    return response.json();
  },

  // Favorites endpoints
  getFavorites: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/favorites?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch favorites');
    return response.json();
  },

  addToFavorites: async (userId, dealId) => {
    const response = await fetch(`${API_BASE_URL}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, dealId }),
    });
    if (!response.ok) throw new Error('Failed to add to favorites');
    return response.json();
  },

  removeFromFavorites: async (userId, dealId) => {
    const response = await fetch(`${API_BASE_URL}/favorites/${dealId}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove from favorites');
    return response.json();
  },

  checkFavorite: async (userId, dealId) => {
    const response = await fetch(`${API_BASE_URL}/favorites/${dealId}/check?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to check favorite status');
    return response.json();
  },

  // User management endpoints (Admin only)
  getUsers: async (adminFirebaseUid) => {
    const response = await fetch(`${API_BASE_URL}/users?firebase_uid=${adminFirebaseUid}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  updateUserRole: async (userId, role, adminFirebaseUid) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, firebase_uid: adminFirebaseUid }),
    });
    if (!response.ok) throw new Error('Failed to update user role');
    return response.json();
  },

  deleteUser: async (userId, adminFirebaseUid) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}?firebase_uid=${adminFirebaseUid}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  // User profile endpoints
  createOrUpdateProfile: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create/update profile');
    return response.json();
  },

  getUserProfile: async (firebaseUid) => {
    const response = await fetch(`${API_BASE_URL}/users/profile/${firebaseUid}`);
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  },

  // Deal history endpoints
  recordDealView: async (dealId, userId) => {
    const response = await fetch(`${API_BASE_URL}/deals/${dealId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Failed to record deal view');
    return response.json();
  },

  getDealHistory: async (userId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/deals/user/${userId}/history${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch deal history');
    return response.json();
  },

  // URL Shortener endpoints
  createShortUrl: async (longUrl, shortCode, createdBy = null) => {
    const response = await fetch(`${API_BASE_URL}/shortener`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ longUrl, shortCode, createdBy }),
    });
    if (!response.ok) throw new Error('Failed to create short URL');
    return response.json();
  },

  getShortenedUrls: async () => {
    const response = await fetch(`${API_BASE_URL}/shortener`);
    if (!response.ok) throw new Error('Failed to fetch shortened URLs');
    return response.json();
  },

  deleteShortUrl: async (id) => {
    const response = await fetch(`${API_BASE_URL}/shortener/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete short URL');
    return response.json();
  },

  // Analytics endpoints
  getAnalyticsSummary: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/summary${queryParams ? `?${queryParams}` : ''}`;
    const firebaseUid = localStorage.getItem('firebase_uid');
    console.log('API: getAnalyticsSummary - firebase_uid:', firebaseUid, 'url:', url);
    const response = await fetch(url, {
      headers: {
        'firebase-uid': firebaseUid || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch analytics summary');
    return response.json();
  },

  getDealPerformance: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/deals/performance${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch deal performance');
    return response.json();
  },

  getUserEngagement: async () => {
    const response = await fetch(`${API_BASE_URL}/analytics/users/engagement`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch user engagement');
    return response.json();
  },

  getCategoryPerformance: async () => {
    const response = await fetch(`${API_BASE_URL}/analytics/categories/performance`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch category performance');
    return response.json();
  },

  getStorePerformance: async () => {
    const response = await fetch(`${API_BASE_URL}/analytics/stores/performance`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch store performance');
    return response.json();
  },

  // Reviews and ratings endpoints
  getDealReviews: async (dealId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/reviews/deal/${dealId}${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch deal reviews');
    return response.json();
  },

  submitDealReview: async (dealId, reviewData) => {
    const response = await fetch(`${API_BASE_URL}/reviews/deal/${dealId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData),
    });
    if (!response.ok) throw new Error('Failed to submit review');
    return response.json();
  },

  submitDealRating: async (dealId, rating) => {
    const response = await fetch(`${API_BASE_URL}/reviews/deal/${dealId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    if (!response.ok) throw new Error('Failed to submit rating');
    return response.json();
  },

  voteOnReview: async (reviewId, voteType) => {
    const response = await fetch(`${API_BASE_URL}/reviews/review/${reviewId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteType }),
    });
    if (!response.ok) throw new Error('Failed to vote on review');
    return response.json();
  },

  // Engagement endpoints
  recordDealClick: async (dealId, clickData = {}) => {
    const response = await fetch(`${API_BASE_URL}/engagement/deal/${dealId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clickData),
    });
    if (!response.ok) throw new Error('Failed to record deal click');
    return response.json();
  },

  recordDealShare: async (dealId, platform) => {
    const response = await fetch(`${API_BASE_URL}/engagement/deal/${dealId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    });
    if (!response.ok) throw new Error('Failed to record deal share');
    return response.json();
  },

  // Notifications endpoints
  getNotifications: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/notifications${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  markNotificationRead: async (notificationId) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },

  markAllNotificationsRead: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
    return response.json();
  },

  getNotificationPreferences: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch notification preferences');
    return response.json();
  },

  updateNotificationPreferences: async (preferences) => {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify(preferences)
    });
    if (!response.ok) throw new Error('Failed to update notification preferences');
    return response.json();
  },

  getUnreadNotificationCount: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch unread notification count');
    return response.json();
  },

  // Search and Discovery endpoints
  saveSearch: async (searchData) => {
    const response = await fetch(`${API_BASE_URL}/search/saved`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify(searchData)
    });
    if (!response.ok) throw new Error('Failed to save search');
    return response.json();
  },

  getSavedSearches: async () => {
    const response = await fetch(`${API_BASE_URL}/search/saved`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch saved searches');
    return response.json();
  },

  updateSavedSearch: async (searchId, searchData) => {
    const response = await fetch(`${API_BASE_URL}/search/saved/${searchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify(searchData)
    });
    if (!response.ok) throw new Error('Failed to update saved search');
    return response.json();
  },

  deleteSavedSearch: async (searchId) => {
    const response = await fetch(`${API_BASE_URL}/search/saved/${searchId}`, {
      method: 'DELETE',
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to delete saved search');
    return response.json();
  },

  recordSearchHistory: async (searchData) => {
    const response = await fetch(`${API_BASE_URL}/search/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchData)
    });
    if (!response.ok) throw new Error('Failed to record search history');
    return response.json();
  },

  getSearchHistory: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/search/history${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch search history');
    return response.json();
  },

  createComparison: async (comparisonData) => {
    const response = await fetch(`${API_BASE_URL}/search/comparisons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify(comparisonData)
    });
    if (!response.ok) throw new Error('Failed to create comparison');
    return response.json();
  },

  getComparisons: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/search/comparisons${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch comparisons');
    return response.json();
  },

  getComparison: async (comparisonId) => {
    const response = await fetch(`${API_BASE_URL}/search/comparisons/${comparisonId}`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch comparison');
    return response.json();
  },

  updateComparison: async (comparisonId, comparisonData) => {
    const response = await fetch(`${API_BASE_URL}/search/comparisons/${comparisonId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify(comparisonData)
    });
    if (!response.ok) throw new Error('Failed to update comparison');
    return response.json();
  },

  deleteComparison: async (comparisonId) => {
    const response = await fetch(`${API_BASE_URL}/search/comparisons/${comparisonId}`, {
      method: 'DELETE',
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to delete comparison');
    return response.json();
  },

  getRecommendations: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/search/recommendations${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    return response.json();
  },

  generateRecommendations: async () => {
    const response = await fetch(`${API_BASE_URL}/search/recommendations/generate`, {
      method: 'POST',
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to generate recommendations');
    return response.json();
  },

  // Business Features - Affiliate Management
  getAffiliateLinks: async () => {
    const response = await fetch(`${API_BASE_URL}/affiliate/links`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch affiliate links');
    return response.json();
  },

  createAffiliateLink: async (linkData) => {
    const response = await fetch(`${API_BASE_URL}/affiliate/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify(linkData)
    });
    if (!response.ok) throw new Error('Failed to create affiliate link');
    return response.json();
  },

  updateAffiliateLink: async (linkId, linkData) => {
    const response = await fetch(`${API_BASE_URL}/affiliate/links/${linkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify(linkData)
    });
    if (!response.ok) throw new Error('Failed to update affiliate link');
    return response.json();
  },

  deleteAffiliateLink: async (linkId) => {
    const response = await fetch(`${API_BASE_URL}/affiliate/links/${linkId}`, {
      method: 'DELETE',
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to delete affiliate link');
    return response.json();
  },

  recordAffiliateClick: async (linkId, clickData = {}) => {
    const response = await fetch(`${API_BASE_URL}/affiliate/links/${linkId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clickData)
    });
    if (!response.ok) throw new Error('Failed to record affiliate click');
    return response.json();
  },

  getCommissionData: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/affiliate/commissions${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch commission data');
    return response.json();
  },

  // Business Features - Bulk Operations
  bulkImportDeals: async (dealsData, format = 'json') => {
    const response = await fetch(`${API_BASE_URL}/bulk/deals/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify({ deals: dealsData, format })
    });
    if (!response.ok) throw new Error('Failed to import deals');
    return response.json();
  },

  bulkExportDeals: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/bulk/deals/export${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to export deals');
    return response.json();
  },

  getBulkImportTemplate: async (format = 'csv') => {
    const response = await fetch(`${API_BASE_URL}/bulk/deals/template?format=${format}`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to get import template');
    return response.json();
  },

  // Business Features - Trust Indicators & Verification
  getTrustIndicators: async () => {
    const response = await fetch(`${API_BASE_URL}/trust/indicators`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch trust indicators');
    return response.json();
  },

  verifyDeal: async (dealId, verificationData = {}) => {
    const response = await fetch(`${API_BASE_URL}/trust/deals/${dealId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      },
      body: JSON.stringify(verificationData)
    });
    if (!response.ok) throw new Error('Failed to verify deal');
    return response.json();
  },

  getStoreReliability: async () => {
    const response = await fetch(`${API_BASE_URL}/trust/stores/reliability`, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch store reliability');
    return response.json();
  },

  // Business Features - Advanced Business Analytics
  getBusinessAnalytics: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/business${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch business analytics');
    return response.json();
  },

  getRevenueAnalytics: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/revenue${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch revenue analytics');
    return response.json();
  },

  getConversionAnalytics: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/conversions${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch conversion analytics');
    return response.json();
  },

  getAffiliatePerformance: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/affiliate/performance${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch affiliate performance');
    return response.json();
  },

  getROIAnalytics: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/analytics/roi${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'firebase-uid': localStorage.getItem('firebase_uid') || ''
      }
    });
    if (!response.ok) throw new Error('Failed to fetch ROI analytics');
    return response.json();
  },
};
