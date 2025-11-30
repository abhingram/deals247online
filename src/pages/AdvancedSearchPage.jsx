import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdvancedSearch from '../components/AdvancedSearch';
import DealCard from '../components/DealCard';
import { Button } from '../components/ui/button';
import { List, Grid3X3, Star, Clock, CheckCircle, AlertTriangle, Shield } from 'lucide-react';

const AdvancedSearchPage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({});
  const [viewMode, setViewMode] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem('searchViewMode') || 'card';
  });

  // Save view mode preference
  React.useEffect(() => {
    localStorage.setItem('searchViewMode', viewMode);
  }, [viewMode]);

  const handleSearch = (results, filters) => {
    setSearchResults(results);
    setCurrentFilters(filters);
  };

  const renderDealListView = () => (
    <div className="space-y-4">
      {searchResults.map((deal, index) => (
        <div
          key={deal.id}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => {/* Handle deal click */}}
        >
          <div className="flex items-center space-x-4">
            <img
              src={deal.image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
              alt={deal.title}
              className="w-16 h-16 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{deal.title}</h3>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 flex-wrap">
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
                <div className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  <span>98% Trust</span>
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Search</h1>
          <p className="text-gray-600">
            Find the perfect deals with our advanced filtering options
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Search Filters Sidebar */}
          <div className="lg:col-span-1">
            <AdvancedSearch onSearch={handleSearch} />
          </div>

          {/* Search Results */}
          <div className="lg:col-span-3">
            {searchResults.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Search Results ({searchResults.length} deals found)
                  </h2>
                  <div className="flex items-center space-x-4">
                    {/* View Toggle */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-colors ${
                          viewMode === 'list'
                            ? 'bg-orange-100 text-orange-600'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="List view"
                      >
                        <List className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('card')}
                        className={`p-2 rounded-md transition-colors ${
                          viewMode === 'card'
                            ? 'bg-orange-100 text-orange-600'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Card view"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </button>
                    </div>
                    <Button variant="outline" onClick={() => setSearchResults([])}>
                      Clear Results
                    </Button>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>Applied filters:</p>
                  <ul className="list-disc list-inside mt-1">
                    {currentFilters.priceRange && (
                      <li>Price: ${currentFilters.priceRange[0]} - ${currentFilters.priceRange[1]}</li>
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
              </div>
            )}

            {searchResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Start Your Search
                </h3>
                <p className="text-gray-600">
                  Use the filters on the left to find deals that match your preferences
                </p>
              </div>
            ) : (
              viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {searchResults.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              ) : (
                renderDealListView()
              )
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdvancedSearchPage;