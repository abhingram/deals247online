import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, ExternalLink, Heart, Share2, BadgeCheck, Shield, Award, AlertTriangle, CheckCircle, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import DealModal from '@/components/DealModal';
import ImageWithFallback from '@/components/ImageWithFallback';

const DealCard = ({ deal }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  
  const {
    title,
    store,
    originalPrice,
    discountedPrice,
    discount,
    rating,
    reviews,
    image,
    expiresIn,
    verified,
    id
  } = deal;

  // Check if deal is favorited on mount
  useEffect(() => {
    if (isAuthenticated && user && id) {
      checkFavoriteStatus();
    }
  }, [isAuthenticated, user, id]);

  const checkFavoriteStatus = async () => {
    try {
      const result = await api.checkFavorite(user.uid, id);
      setIsFavorited(result.isFavorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleGetDeal = (e) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  const handleCardClick = () => {
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save deals to your favorites.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !id) return;

    setLoading(true);
    try {
      if (isFavorited) {
        await api.removeFromFavorites(user.uid, id);
        setIsFavorited(false);
        toast({
          title: "Removed from favorites",
          description: "Deal removed from your favorites.",
        });
      } else {
        await api.addToFavorites(user.uid, id);
        setIsFavorited(true);
        toast({
          title: "Added to favorites",
          description: "Deal added to your favorites.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorites.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const dealUrl = `${window.location.origin}/deal/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Check out this amazing deal: ${title} - ${discount}% off!`,
          url: dealUrl,
        });
        // Record the share
        if (isAuthenticated && user) {
          await api.recordDealShare(id, 'native_share');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          fallbackShare();
        }
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    const dealUrl = `${window.location.origin}/deal/${id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(dealUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Deal link copied to clipboard. Share it with your friends!",
      });
      // Record the share
      if (isAuthenticated && user) {
        api.recordDealShare(id, 'copy_link').catch(console.error);
      }
    }).catch(() => {
      toast({
        title: "Share Deal",
        description: `Share this link: ${dealUrl}`,
      });
    });
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        className="deal-card bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group relative flex"
        onClick={handleCardClick}
      >
        <div className="deal-content flex-1 pr-3">
          <div className="deal-title text-sm font-semibold text-gray-800 leading-tight overflow-hidden" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {title}
          </div>

          <div className="deal-prices mt-1 flex items-center gap-2">
            <span className="discount text-xs font-bold text-green-600">
              ↓{discount}%
            </span>
            <span className="price text-base font-bold text-black">
              ${discountedPrice}
            </span>
            <span className="old-price text-sm text-gray-500 line-through">
              ${originalPrice}
            </span>
          </div>

          <div className="deal-meta mt-1.5 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            {/* Trust Indicators */}
            <div className="flex items-center gap-1">
              {verified ? (
                <div className="flex items-center bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  <span className="font-medium">Verified</span>
                </div>
              ) : (
                <div className="flex items-center bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  <span className="font-medium">Unverified</span>
                </div>
              )}

              {/* Store Trust Score */}
              <div className="flex items-center bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                <Shield className="h-3 w-3 mr-1" />
                <span className="font-medium">98% Trust</span>
              </div>
            </div>

            {/* Rating and Reviews */}
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-medium">{rating}</span>
              </div>
              <span className="text-gray-400">({reviews.toLocaleString()})</span>
            </div>

            {/* Expiration */}
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>{expiresIn}</span>
            </div>

            {/* Store Badge */}
            <div className="ml-auto flex items-center gap-1">
              <Award className="h-3 w-3 text-purple-500" />
              <span className="font-medium text-gray-600 uppercase">{store}</span>
            </div>
          </div>

          {/* Additional Trust Indicators */}
          <div className="deal-trust mt-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center text-green-600">
                <ThumbsUp className="h-3 w-3 mr-1" />
                <span>95% positive</span>
              </div>
              <div className="flex items-center text-blue-600">
                <ExternalLink className="h-3 w-3 mr-1" />
                <span>Active link</span>
              </div>
            </div>
            <div className="text-gray-400">
              Updated 2h ago
            </div>
          </div>
        </div>

        <div className="deal-image flex-shrink-0 w-24 h-full">
          <ImageWithFallback 
            src={image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
            alt={title}
            className="w-full h-full object-cover rounded-md"
            fallbackClassName="bg-gray-200 text-gray-500 rounded-md"
          />
        </div>

        {/* Hidden elements for functionality */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            disabled={loading}
            className={`p-1.5 rounded-full shadow-sm transition-colors ${
              isFavorited
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Heart className={`h-3 w-3 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="bg-white p-1.5 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Share2 className="h-3 w-3 text-gray-700" />
          </button>
        </div>
      </motion.div>
    
    <DealModal deal={deal} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};

export default DealCard;