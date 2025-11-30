import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import DealCard from './DealCard';
import { List, Grid3X3, Star, Clock, CheckCircle, AlertTriangle, Shield } from 'lucide-react';

const Recommendations = ({ limit = 6 }) => {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem('recommendationsViewMode') || 'card';
  });

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('recommendationsViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const recs = await api.getRecommendations({ limit });
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      // If no recommendations exist, show some popular deals as fallback
      try {
        const popularDeals = await api.getDeals({
          sortBy: 'most_popular',
          limit: limit
        });
        setRecommendations(popularDeals.map(deal => ({
          ...deal,
          reason: 'Popular deal'
        })));
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = async () => {
    setIsGenerating(true);
    try {
      await api.generateRecommendations();
      await loadRecommendations(); // Reload after generation

      toast({
        title: "Recommendations updated",
        description: "Your personalized recommendations have been refreshed.",
      });
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate new recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderDealListView = () => (
    <div className="space-y-4">
      {recommendations.map((recommendation) => (
        <div
          key={recommendation.id}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
          onClick={() => {/* Handle deal click */}}
        >
          {recommendation.reason && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md z-10">
              {recommendation.reason}
            </div>
          )}
          <div className="flex items-center space-x-4">
            <img
              src={recommendation.image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
              alt={recommendation.title}
              className="w-16 h-16 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{recommendation.title}</h3>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 flex-wrap">
                <span className="font-medium text-gray-700">{recommendation.store}</span>
                <span className="text-green-600 font-semibold">↓{recommendation.discount}%</span>
                <span className="font-bold text-black">${recommendation.discountedPrice}</span>
                <span className="line-through">${recommendation.originalPrice}</span>
                <div className="flex items-center">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                  <span>{recommendation.rating}</span>
                  <span className="ml-1">({recommendation.reviews})</span>
                </div>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {recommendation.expiresIn}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                {recommendation.verified ? (
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Recommended for You</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Recommended for You</h2>
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
          <Button
            variant="outline"
            onClick={generateRecommendations}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Refresh Recommendations'}
          </Button>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No recommendations available yet.</p>
          <p className="text-sm text-gray-400 mb-6">
            Browse some deals and we'll start personalizing recommendations for you!
          </p>
          <Button onClick={generateRecommendations} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Recommendations'}
          </Button>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="relative">
                  <DealCard deal={recommendation} />
                  {recommendation.reason && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md">
                      {recommendation.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            renderDealListView()
          )}

          <div className="text-center">
            <Button variant="outline" asChild>
              <a href="/recommendations">View All Recommendations</a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Recommendations;