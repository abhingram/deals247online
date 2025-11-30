import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  Home,
  Search,
  User,
  Plus,
  BarChart3,
  Heart,
  Settings,
  X,
  ChevronLeft
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Mobile Navigation Component
 * Provides a mobile-optimized navigation experience
 */
export const MobileNavigation = ({ savedDealsCount = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const navigationItems = [
    {
      label: 'Home',
      icon: Home,
      path: '/',
      active: location.pathname === '/'
    },
    {
      label: 'Search',
      icon: Search,
      path: '/search',
      active: location.pathname === '/search'
    },
    {
      label: 'Saved',
      icon: Heart,
      path: '/dashboard',
      active: location.pathname === '/dashboard',
      badge: savedDealsCount > 0 ? savedDealsCount : null
    },
    {
      label: 'Submit Deal',
      icon: Plus,
      path: '/submit-deal',
      active: location.pathname === '/submit-deal',
      requiresAuth: true
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      path: '/admin',
      active: location.pathname === '/admin',
      requiresAuth: true,
      requiresAdmin: true
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const filteredItems = navigationItems.filter(item => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.requiresAdmin && !user?.role?.includes('admin')) return false;
    return true;
  });

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => setIsOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <h1 className="text-lg font-semibold text-gray-900">Deals247</h1>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="relative p-2"
            >
              <Heart className="h-5 w-5" />
              {savedDealsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {savedDealsCount > 9 ? '9+' : savedDealsCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="p-2"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {isAuthenticated && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user?.displayName || 'User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Items */}
              <div className="flex-1 p-4">
                <nav className="space-y-2">
                  {filteredItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        item.active
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => handleNavigation('/dashboard')}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex items-center justify-around">
          {filteredItems.slice(0, 5).map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 flex-1 ${
                item.active
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium truncate">{item.label}</span>
              {item.badge && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add padding to account for fixed navigation */}
      <div className="md:hidden pt-16 pb-20" />
    </>
  );
};

/**
 * Mobile-Optimized Deal Card
 */
export const MobileDealCard = ({ deal, onSave, onClick, isSaved = false }) => {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-95"
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Deal Image */}
        <div className="flex-shrink-0">
          <img
            src={deal.image || '/default-deal.png'}
            alt={deal.title}
            className="w-16 h-16 rounded-lg object-cover"
            loading="lazy"
          />
        </div>

        {/* Deal Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-2 text-sm leading-tight mb-1">
            {deal.title}
          </h3>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">{deal.store}</span>
            {deal.verified && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Verified
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-green-600">
                ${deal.discounted_price}
              </span>
              <span className="text-sm text-gray-400 line-through">
                ${deal.original_price}
              </span>
              <span className="text-sm font-medium text-orange-600">
                {deal.discount}% off
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSave(deal);
              }}
              className={`p-2 ${isSaved ? 'text-red-500' : 'text-gray-400'}`}
            >
              <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {deal.expires_at && (
            <div className="mt-2">
              <span className="text-xs text-red-600">
                Expires: {new Date(deal.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Touch-Friendly Button Component
 */
export const TouchButton = ({ children, onClick, variant = "default", size = "default", className = "", ...props }) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={`min-h-[44px] min-w-[44px] touch-manipulation active:scale-95 transition-transform ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
};

/**
 * Swipeable Deal List Component
 */
export const SwipeableDealList = ({ deals, onDealClick, onSaveDeal, savedDealIds = [] }) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (deal) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left - could implement quick actions
      console.log('Left swipe on deal:', deal.id);
    }

    if (isRightSwipe) {
      // Swipe right - could implement save action
      onSaveDeal(deal);
    }
  };

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <div
          key={deal.id}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => onTouchEnd(deal)}
          className="select-none"
        >
          <MobileDealCard
            deal={deal}
            onClick={() => onDealClick(deal)}
            onSave={onSaveDeal}
            isSaved={savedDealIds.includes(deal.id)}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Mobile Search Component
 */
export const MobileSearch = ({ onSearch, placeholder = "Search deals..." }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`relative flex items-center bg-gray-100 rounded-full px-4 py-2 transition-all ${
        isFocused ? 'bg-white shadow-md border-2 border-orange-200' : ''
      }`}>
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuery('')}
            className="p-1 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
};