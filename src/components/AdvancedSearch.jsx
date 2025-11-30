import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { useToast } from './ui/use-toast';

const AdvancedSearch = ({ onSearch, initialFilters = {} }) => {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    priceRange: [0, 1000],
    discountRange: [0, 100],
    stores: [],
    categories: [],
    sortBy: 'newest',
    ...initialFilters
  });

  const [availableStores, setAvailableStores] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      // Get unique stores and categories from deals
      const deals = await api.getDeals({ limit: 1000 });
      const stores = [...new Set(deals.map(deal => deal.store))].filter(Boolean);
      const categories = [...new Set(deals.flatMap(deal => deal.categories || []))].filter(Boolean);

      setAvailableStores(stores);
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const handleStoreChange = (store, checked) => {
    setFilters(prev => ({
      ...prev,
      stores: checked
        ? [...prev.stores, store]
        : prev.stores.filter(s => s !== store)
    }));
  };

  const handleCategoryChange = (category, checked) => {
    setFilters(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, category]
        : prev.categories.filter(c => c !== category)
    }));
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      // Record search history
      await api.recordSearchHistory({
        query: '',
        filters: filters,
        timestamp: new Date().toISOString()
      });

      // Perform search
      const searchParams = {
        minPrice: filters.priceRange[0],
        maxPrice: filters.priceRange[1],
        minDiscount: filters.discountRange[0],
        maxDiscount: filters.discountRange[1],
        stores: filters.stores.join(','),
        categories: filters.categories.join(','),
        sortBy: filters.sortBy,
        limit: 50
      };

      const results = await api.getDeals(searchParams);
      onSearch(results, filters);

      toast({
        title: "Search completed",
        description: `Found ${results.length} deals matching your criteria.`,
      });
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    try {
      const searchName = prompt('Enter a name for this saved search:');
      if (!searchName) return;

      await api.saveSearch({
        name: searchName,
        filters: filters,
        createdAt: new Date().toISOString()
      });

      toast({
        title: "Search saved",
        description: "Your search has been saved for future use.",
      });
    } catch (error) {
      console.error('Failed to save search:', error);
      toast({
        title: "Save failed",
        description: "Failed to save search. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      priceRange: [0, 1000],
      discountRange: [0, 100],
      stores: [],
      categories: [],
      sortBy: 'newest'
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Advanced Search</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
          <Button variant="outline" onClick={handleSaveSearch}>
            Save Search
          </Button>
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
        </Label>
        <Slider
          value={filters.priceRange}
          onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
          max={2000}
          min={0}
          step={10}
          className="w-full"
        />
      </div>

      {/* Discount Range */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Discount Range: {filters.discountRange[0]}% - {filters.discountRange[1]}%
        </Label>
        <Slider
          value={filters.discountRange}
          onValueChange={(value) => setFilters(prev => ({ ...prev, discountRange: value }))}
          max={100}
          min={0}
          step={5}
          className="w-full"
        />
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Sort By</Label>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
          className="w-full p-2 border rounded-md"
        >
          <option value="newest">Newest First</option>
          <option value="ending_soon">Ending Soon</option>
          <option value="highest_rated">Highest Rated</option>
          <option value="most_popular">Most Popular</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="discount_high">Highest Discount</option>
        </select>
      </div>

      {/* Stores */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Stores</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
          {availableStores.map(store => (
            <div key={store} className="flex items-center space-x-2">
              <Checkbox
                id={`store-${store}`}
                checked={filters.stores.includes(store)}
                onCheckedChange={(checked) => handleStoreChange(store, checked)}
              />
              <Label htmlFor={`store-${store}`} className="text-sm">
                {store}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Categories</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
          {availableCategories.map(category => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={filters.categories.includes(category)}
                onCheckedChange={(checked) => handleCategoryChange(category, checked)}
              />
              <Label htmlFor={`category-${category}`} className="text-sm">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Searching...' : 'Search Deals'}
      </Button>
    </div>
  );
};

export default AdvancedSearch;