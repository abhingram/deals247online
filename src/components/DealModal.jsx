import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Copy, Share2, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import ImageWithFallback from '@/components/ImageWithFallback';

const DealModal = ({ deal, open, onOpenChange }) => {
  const { isAuthenticated, user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  
  if (!deal) return null;

  // Check if deal is favorited and record view when modal opens
  useEffect(() => {
    if (open && isAuthenticated && user && deal.id) {
      checkFavoriteStatus();
      recordDealView();
    }
  }, [open, isAuthenticated, user, deal.id]);

  const checkFavoriteStatus = async () => {
    try {
      const result = await api.checkFavorite(user.uid, deal.id);
      setIsFavorited(result.isFavorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const recordDealView = async () => {
    try {
      await api.recordDealView(user.uid, deal.id);
    } catch (error) {
      console.error('Error recording deal view:', error);
    }
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

    if (!user || !deal.id) return;

    setLoading(true);
    try {
      if (isFavorited) {
        await api.removeFromFavorites(user.uid, deal.id);
        setIsFavorited(false);
        toast({
          title: "Removed from favorites",
          description: "Deal removed from your favorites.",
        });
      } else {
        await api.addToFavorites(user.uid, deal.id);
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

  const handleCopyLink = () => {
    const url = `${window.location.origin}/deal/${deal.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Deal link copied to clipboard!",
    });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/deal/${deal.id}`;
    if (navigator.share) {
      navigator.share({
        title: deal.title,
        text: `Check out this deal: ${deal.title}`,
        url: url,
      }).catch(() => {
        handleCopyLink();
      });
    } else {
      handleCopyLink();
    }
  };

  const handleBuy = () => {
    toast({
      title: "Opening Deal",
      description: `Redirecting to ${deal.store}...`,
    });
    // In production, this would open the actual store link
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-white">
        {/* Title Header - Compact */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white">
          <h3 className="text-sm font-bold text-gray-900 leading-tight">
            {deal.title}
          </h3>
        </div>

        {/* Square Image Section */}
        <div className="relative aspect-square w-full bg-white">
          <ImageWithFallback 
            src={deal.image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
            alt={deal.title}
            className="w-full h-full object-cover"
            fallbackClassName="bg-gray-200 text-gray-500"
          />
          {deal.discount && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-600 text-white px-2.5 py-1 rounded-full font-bold text-sm shadow-lg">
              {deal.discount}% OFF
            </div>
          )}
        </div>

        {/* Content Section - No Scroll */}
        <div className="px-4 py-3 space-y-2.5 bg-white">
          {/* Price Row */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-orange-600">
              ₹{deal.discountedPrice}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 line-through">
                ₹{deal.originalPrice}
              </div>
              <div className="text-xs text-green-600 font-semibold">
                {deal.discount}% Off
              </div>
            </div>
          </div>

          {/* Store Badge */}
          <div className="flex items-center justify-between text-xs">
            <span className="px-2 py-1 bg-orange-50 rounded-md font-semibold text-orange-600 border border-orange-100">
              {deal.store}
            </span>
            {deal.expiresIn && (
              <span className="text-gray-500">{deal.expiresIn}</span>
            )}
          </div>

          {/* Buy Button */}
          <Button
            onClick={handleBuy}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all text-sm"
          >
            Buy Now @ {deal.store}
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Button>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={loading}
              className={`flex flex-col items-center gap-1 h-auto py-2 text-xs border transition-all ${
                isFavorited
                  ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'border-gray-200 hover:bg-orange-50 hover:border-orange-300'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current text-red-500' : 'text-orange-500'}`} />
              <span className="font-medium">Like</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1 h-auto py-2 text-xs border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              <Copy className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Copy</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex flex-col items-center gap-1 h-auto py-2 text-xs border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all"
            >
              <Share2 className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Share</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DealModal;
