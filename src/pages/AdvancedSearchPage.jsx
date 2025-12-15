import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdvancedSearch from '../components/AdvancedSearch';
import DealCard from '../components/DealCard';
import { Button } from '../components/ui/button';
import { List, Grid3X3, Star, Clock, CheckCircle, AlertTriangle, Shield, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedSearchPage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({});
  const [viewMode, setViewMode] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem('searchViewMode') || 'card';
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Save view mode preference
  React.useEffect(() => {
    localStorage.setItem('searchViewMode', viewMode);
  }, [viewMode]);

  const handleSearch = (results, filters) => {
    setSearchResults(results);
    setCurrentFilters(filters);
  };

  const renderDealListView = () => (
    <div className="space-y-3 sm:space-y-4">
      {searchResults.map((deal, index) => (
        <div
          key={deal.id}
          className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => {/* Handle deal click */}}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <img
              src={deal.image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
              alt={deal.title}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 mb-2">{deal.title}</h3>
              <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm text-gray-500">
                <span className="font-medium text-gray-700">{deal.store}</span>
                <span className="text-green-600 font-semibold">↓{deal.discount}%</span>
                <span className="font-bold text-black text-sm sm:text-base">₹{deal.discountedPrice}</span>
                <span className="line-through">₹{deal.originalPrice}</span>
              </div>
              <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                <div className="flex items-center">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                  <span>{deal.rating}</span>
                  <span className="ml-1 text-gray-500">({deal.reviews})</span>
                </div>
                <span className="flex items-center text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {deal.publishedAt}
                </span>
                <div className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  <Shield className="h-3 w-3 mr-1" />
                  <span>98%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Advanced Search</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Find the perfect deals with our advanced filtering options
          </p>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Button
            onClick={() => setIsFiltersOpen(true)}
            className="w-full min-h-[44px] flex items-center justify-center gap-2"
            variant="outline"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Mobile Filters Drawer */}
        <AnimatePresence>
          {isFiltersOpen && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={() => setIsFiltersOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 lg:hidden"
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                  <button
                    onClick={() => setIsFiltersOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4">
                  <AdvancedSearch onSearch={(results, filters) => {
                    handleSearch(results, filters);
                    setIsFiltersOpen(false);
                  }} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Search Results */}
        <div className="lg:col-span-3">
          {searchResults.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">
                  Results ({searchResults.length})
                </h2>
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* View Toggle */}
                  <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-md transition-colors ${
                        viewMode === 'list'
                          ? 'bg-orange-100 text-orange-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="List view"
                    >
                      <List className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-md transition-colors ${
                        viewMode === 'card'
                          ? 'bg-orange-100 text-orange-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Card view"
                    >
                      <Grid3X3 className="h-5 w-5" />
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSearchResults([])}
                    className="min-h-[44px] text-sm sm:text-base"
                  >
                    <span className="hidden sm:inline">Clear Results</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>Applied filters:</p>
                <ul className="list-disc list-inside mt-1">
                  {currentFilters.priceRange && (
                    <li>Price: ₹{currentFilters.priceRange[0]} - ₹{currentFilters.priceRange[1]}</li>
                  )}
                  {currentFilters.discountRange && (
                    <li>Discount: {currentFilters.discountRange[0]}% - {currentFilters.discountRange[1]}%</li>
                  )}
                  {currentFilters.stores && currentFilters.stores.length > 0 && (
                    <li>Stores: {currentFilters.stores.join(', ')}</li>
                  )}
                  {currentFilters.categories && currentFilters.categories.length > 0 && (
                    <li>Categories: {currentFilters.categories.join(', ')}</li>
                  )}
                  {currentFilters.sortBy && (
                    <li>Sort by: {currentFilters.sortBy.replace('_', ' ')}</li>
                  )}
                </ul>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <div className="text-5xl sm:text-6xl mb-4">🔍</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    Start Your Search
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    <span className="hidden lg:inline">Use the filters on the left to find deals that match your preferences</span>
                    <span className="lg:hidden">Tap "Show Filters" above to start searching</span>
                  </p>
                </div>
              ) : (
                viewMode === 'card' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                    {searchResults.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                ) : (
                  renderDealListView()
                )
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdvancedSearchPage;