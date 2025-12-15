import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DealCard from '@/components/DealCard';
import DealModal from '@/components/DealModal';
import FilterSidebar from '@/components/FilterSidebar';
import { SlidersHorizontal, List, Grid3X3, Star, Clock, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { getTimeSincePublished } from '@/lib/utils';

const DealsGrid = ({ searchQuery, selectedCategory, filterType }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({});
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem('dealsViewMode') || 'card';
  });
  const limit = 12;

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('dealsViewMode', viewMode);
  }, [viewMode]);

  // Debug: Log when searchQuery changes
  useEffect(() => {
    console.log('DealsGrid received searchQuery:', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setOffset(0); // Reset offset when filters change
  }, [searchQuery, selectedCategory, filters, filterType]);

  useEffect(() => {
    fetchDeals();
  }, [offset, searchQuery, selectedCategory, filters, filterType]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      
      const params = { limit, offset };
      
      // Add search query
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
        console.log('Searching for:', searchQuery.trim());
      }
      
      // Add category filter
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
        console.log('Category filter:', selectedCategory);
      }
      
      // Add price filters
      if (filters.minPrice !== undefined && filters.minPrice > 0) {
        params.minPrice = filters.minPrice;
      }
      if (filters.maxPrice !== undefined && filters.maxPrice < 2000) {
        params.maxPrice = filters.maxPrice;
      }
      
      // Add store filter
      if (filters.stores && filters.stores.length > 0) {
        params.store = filters.stores[0]; // API supports single store for now
      }
      
      // Add rating filter
      if (filters.minRating) {
        params.minRating = filters.minRating;
      }
      
      // Add filter type specific parameters
      if (filterType) {
        switch (filterType) {
          case 'hot':
            params.minDiscount = 50; // Deals with 50% or more discount
            params.sortBy = 'discount_desc'; // Sort by highest discount first
            break;
          case 'popular':
            params.sortBy = 'most_viewed'; // Sort by most viewed/clicked
            break;
          case 'talking':
            params.hasComments = true; // Only deals with comments
            params.sortBy = 'most_commented'; // Sort by most commented
            break;
          case 'new':
          default:
            params.sortBy = 'newest'; // Sort by newest deals
            break;
        }
      }
      
      console.log('Fetching deals with params:', params);
      const response = await api.getDeals(params);
      
      // Transform API data to match frontend format
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
        publishedAt: getTimeSincePublished(deal.created_at || new Date()),
        verified: Boolean(deal.verified),
      }));
      
      setDeals(transformedDeals);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast({
        title: "Error",
        description: "Failed to load deals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setOffset(prev => prev + limit);
  };

  const handleDealClick = (deal) => {
    setSelectedDeal(deal);
    setModalOpen(true);
  };

  const renderDealListView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {deals.map((deal, index) => (
        <motion.div
          key={deal.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleDealClick(deal)}
        >
          <div className="p-3 sm:p-4">
            {/* Content Section */}
            <div className="flex gap-3 sm:gap-4">
              {/* Left Column: All Content */}
              <div className="flex-1 min-w-0">
                {/* Row 1: Deal Title - Not bold */}
                <h3 className="text-gray-900 text-sm line-clamp-2 mb-3">{deal.title}</h3>

                {/* Row 2: Discount, Prices, Store - Equal width items */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2 text-xs">
                  <div className="flex items-center justify-center bg-green-100 text-green-700 px-1.5 sm:px-2 py-1 rounded-md">
                    <span className="truncate">↓{deal.discount}%</span>
                  </div>
                  <div className="flex items-center justify-center font-bold text-gray-900 truncate">
                    ₹{deal.discountedPrice}
                  </div>
                  <div className="flex items-center justify-center text-gray-400 line-through truncate">
                    ₹{deal.originalPrice}
                  </div>
                  <div className="flex items-center justify-center bg-orange-50 text-orange-700 px-1.5 sm:px-2 py-1 rounded-md">
                    <span className="truncate text-xs">{deal.store}</span>
                  </div>
                </div>

                {/* Row 3: Rating, Clicks, Expiration - Equal width items */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
                  <div className="flex items-center justify-center bg-yellow-50 text-yellow-700 px-1.5 sm:px-2 py-1 rounded-md">
                    <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400 text-yellow-400 mr-0.5 sm:mr-1 flex-shrink-0" />
                    <span className="truncate">{deal.rating}</span>
                  </div>

                  <div className="flex items-center justify-center bg-blue-50 text-blue-700 px-1.5 sm:px-2 py-1 rounded-md">
                    <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1 flex-shrink-0" />
                    <span className="truncate">{deal.total_clicks || 55}</span>
                  </div>

                  <div className="flex items-center justify-center bg-red-50 text-red-700 px-1.5 sm:px-2 py-1 rounded-md">
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1 flex-shrink-0" />
                    <span className="text-xs truncate">{deal.publishedAt}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Image Only - Full height */}
              <div className="flex-shrink-0 w-24 h-20 sm:w-32 sm:h-24">
                <img
                  src={deal.image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
                  alt={deal.title}
                  className="w-full h-full object-cover rounded-lg shadow-sm"
                />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <section className="bg-gray-50 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {filterType === 'hot' ? '🔥 Hot Deals' :
             filterType === 'popular' ? '⭐ Popular Deals' :
             filterType === 'talking' ? '💬 Talking Deals' :
             '🆕 Latest Deals'}
          </h2>
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            {/* View Toggle */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  viewMode === 'list'
                    ? 'bg-orange-100 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="List view"
              >
                <List className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  viewMode === 'card'
                    ? 'bg-orange-100 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Card view"
              >
                <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden min-h-[44px] flex-1 sm:flex-initial"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        <div className="flex gap-4 sm:gap-6">
          <FilterSidebar 
            show={showFilters} 
            onClose={() => setShowFilters(false)}
            onFilterChange={setFilters}
          />
          
          <div className="flex-1 min-w-0">
            {loading && deals.length === 0 ? (
              viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm animate-pulse flex">
                      <div className="flex-1 pr-3">
                        <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="flex gap-2 mb-1">
                          <div className="h-3 bg-gray-200 rounded w-8"></div>
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="flex gap-3 mb-2">
                          <div className="h-3 bg-gray-200 rounded w-8"></div>
                          <div className="h-3 bg-gray-200 rounded w-12"></div>
                          <div className="h-3 bg-gray-200 rounded w-8"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 ml-auto"></div>
                        </div>
                      </div>
                      <div className="w-24 h-full">
                        <div className="w-full h-full bg-gray-200 rounded-md"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg shadow-sm animate-pulse">
                      <div className="p-3 sm:p-4">
                        {/* Title skeleton */}
                        <div className="h-3.5 bg-gray-200 rounded w-3/4 mb-3"></div>
                        
                        {/* Content skeleton */}
                        <div className="flex gap-3 sm:gap-4">
                          <div className="flex-1 space-y-2.5">
                            {/* Row 2 skeleton */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="h-6 w-12 bg-gray-200 rounded-md"></div>
                              <div className="h-6 w-16 bg-gray-200 rounded"></div>
                              <div className="h-5 w-14 bg-gray-200 rounded"></div>
                              <div className="h-5 w-16 bg-gray-200 rounded-md ml-auto"></div>
                            </div>
                            {/* Row 3 skeleton */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="h-6 w-14 bg-gray-200 rounded-md"></div>
                              <div className="h-6 w-16 bg-gray-200 rounded-md"></div>
                              <div className="h-6 w-12 bg-gray-200 rounded-md"></div>
                              <div className="h-6 w-20 bg-gray-200 rounded-md"></div>
                            </div>
                          </div>
                          {/* Image skeleton */}
                          <div className="w-20 h-16 sm:w-28 sm:h-24 bg-gray-200 rounded-lg flex-shrink-0"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : deals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-base sm:text-lg">No deals found</p>
              </div>
            ) : (
              <>
                {viewMode === 'card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {deals.map((deal, index) => (
                      <motion.div
                        key={deal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      >
                        <DealCard deal={deal} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  renderDealListView()
                )}

                {deals.length < total && (
                  <div className="mt-8 sm:mt-12 flex justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={loadMore}
                      disabled={loading}
                      className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 min-h-[44px] px-6 sm:px-8"
                    >
                      {loading ? 'Loading...' : 'Load More Deals'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Deal Modal for List View */}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </section>
  );
};

export default DealsGrid;