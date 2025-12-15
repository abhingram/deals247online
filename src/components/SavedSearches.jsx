import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

const SavedSearches = ({ onApplySearch }) => {
  const { toast } = useToast();
  const [savedSearches, setSavedSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      const searches = await api.getSavedSearches();
      setSavedSearches(searches);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
      toast({
        title: "Load failed",
        description: "Failed to load saved searches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applySearch = async (search) => {
    try {
      // Apply the saved filters
      onApplySearch(search.filters);

      // Record this as a search history entry
      await api.recordSearchHistory({
        query: '',
        filters: search.filters,
        timestamp: new Date().toISOString(),
        fromSavedSearch: true,
        savedSearchId: search.id
      });

      toast({
        title: "Search applied",
        description: `Applied saved search: ${search.name}`,
      });
    } catch (error) {
      console.error('Failed to apply search:', error);
      toast({
        title: "Apply failed",
        description: "Failed to apply saved search.",
        variant: "destructive",
      });
    }
  };

  const deleteSearch = async (searchId) => {
    if (!confirm('Are you sure you want to delete this saved search?')) return;

    try {
      await api.deleteSavedSearch(searchId);
      setSavedSearches(prev => prev.filter(search => search.id !== searchId));

      toast({
        title: "Search deleted",
        description: "Saved search has been deleted.",
      });
    } catch (error) {
      console.error('Failed to delete search:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete saved search.",
        variant: "destructive",
      });
    }
  };

  const formatFilters = (filters) => {
    const parts = [];

    if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000)) {
      parts.push(`₹${filters.priceRange[0]} - ₹${filters.priceRange[1]}`);
    }

    if (filters.discountRange && (filters.discountRange[0] > 0 || filters.discountRange[1] < 100)) {
      parts.push(`${filters.discountRange[0]}% - ${filters.discountRange[1]}% off`);
    }

    if (filters.stores && filters.stores.length > 0) {
      parts.push(`Stores: ${filters.stores.join(', ')}`);
    }

    if (filters.categories && filters.categories.length > 0) {
      parts.push(`Categories: ${filters.categories.join(', ')}`);
    }

    if (filters.sortBy && filters.sortBy !== 'newest') {
      parts.push(`Sort: ${filters.sortBy.replace('_', ' ')}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Saved Searches</h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Saved Searches</h2>
        <Button variant="outline" onClick={loadSavedSearches}>
          Refresh
        </Button>
      </div>

      {savedSearches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No saved searches yet.</p>
          <p className="text-sm text-gray-400">
            Use the advanced search to save your favorite search criteria!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedSearches.map((search) => (
            <div
              key={search.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{search.name}</h3>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => applySearch(search)}
                  >
                    Apply Search
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteSearch(search.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                {formatFilters(search.filters)}
              </p>

              <p className="text-xs text-gray-400">
                Created: {new Date(search.createdAt).toLocaleDateString()}
                {search.lastUsed && (
                  <> • Last used: {new Date(search.lastUsed).toLocaleDateString()}</>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedSearches;