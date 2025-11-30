import React, { useState, useEffect, useRef } from 'react';
import { Search, Menu, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthModal } from './AuthModal';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const Header = ({ onSearch }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const debounceTimeout = useRef(null);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    console.log('Search input changed to:', value);
    
    // Clear existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    // Debounce search with 500ms delay
    debounceTimeout.current = setTimeout(() => {
      console.log('Triggering search with:', value.trim());
      if (onSearch) {
        onSearch(value.trim());
      }
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
                Deals247
              </span>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="/" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                New
              </a>
              <a href="/hot" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                Hot
              </a>
              <a href="/popular" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                Popular
              </a>
              <a href="/talking" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                Talking
              </a>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md ml-8">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search for deals..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && <NotificationBell />}

            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <Button
                variant="outline"
                onClick={() => setAuthModalOpen(true)}
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                Sign In
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search for deals..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-2">
              <a href="/" className="text-gray-700 hover:text-orange-600 font-medium py-2">New</a>
              <a href="/hot" className="text-gray-700 hover:text-orange-600 font-medium py-2">Hot</a>
              <a href="/popular" className="text-gray-700 hover:text-orange-600 font-medium py-2">Popular</a>
              <a href="/talking" className="text-gray-700 hover:text-orange-600 font-medium py-2">Talking</a>
            </nav>
          </div>
        </div>
      )}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      />
    </header>
  );
};

export default Header;