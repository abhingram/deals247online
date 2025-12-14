import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  ArrowLeft, 
  ExternalLink, 
  Heart, 
  Share2, 
  Star, 
  Clock, 
  BadgeCheck,
  Copy,
  Facebook,
  Twitter,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageWithFallback from '@/components/ImageWithFallback';
import { getTimeSincePublished } from '@/lib/utils';

const DealDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeal();
  }, [id]);

  const fetchDeal = async () => {
    try {
      setLoading(true);
      const response = await api.getDeal(id);
      
      // Transform API data
      const transformedDeal = {
        id: response.id,
        title: response.title,
        store: response.store,
        originalPrice: parseFloat(response.original_price),
        discountedPrice: parseFloat(response.discounted_price),
        discount: response.discount,
        rating: parseFloat(response.rating),
        reviews: response.reviews,
        image: response.image,
        category: response.category,
        publishedAt: getTimeSincePublished(response.created_at || new Date()),
        verified: Boolean(response.verified),
        createdAt: response.created_at ? new Date(response.created_at) : new Date(),
      };
      
      setDeal(transformedDeal);
      
      // Record deal view if user is authenticated
      if (isAuthenticated && user) {
        try {
          await api.recordDealView(user.uid, id);
        } catch (error) {
          console.error('Error recording deal view:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast({
        title: "Error",
        description: "Failed to load deal details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out this deal: ${deal.title}`;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      email: `mailto:?subject=${encodeURIComponent(deal.title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Deal link copied to clipboard!",
    });
  };

  const handleGetDeal = () => {
    toast({
      title: "Opening Deal",
      description: `Redirecting to ${deal.store}...`,
    });
    // In production, this would open the actual store link
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="animate-pulse">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 sm:w-1/4 mb-4 sm:mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div className="h-64 sm:h-80 md:h-96 bg-gray-200 rounded-lg"></div>
              <div className="space-y-3 sm:space-y-4">
                <div className="h-6 sm:h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-24 sm:h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Deal Not Found</h1>
          <Button onClick={() => navigate('/')}>Go Back Home</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{deal.title} - Deals247</title>
        <meta name="description" content={`Get ${deal.discount}% off on ${deal.title} at ${deal.store}. Save $${(deal.originalPrice - deal.discountedPrice).toFixed(2)}!`} />
      </Helmet>
      
      <Header />
      
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Breadcrumbs */}
        <nav className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm text-gray-600 overflow-x-auto">
          <Link to="/" className="hover:text-orange-600 whitespace-nowrap">Home</Link>
          <span>/</span>
          <Link to={`/?category=${deal.category}`} className="hover:text-orange-600 whitespace-nowrap">{deal.category}</Link>
          <span>/</span>
          <span className="text-gray-900 truncate">{deal.title}</span>
        </nav>

        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 sm:mb-6 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Back</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Image Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8"
          >
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
              <ImageWithFallback 
                src={deal.image || "https://images.unsplash.com/photo-1595872018818-97555653a011"}
                alt={deal.title}
                className="w-full h-full object-cover rounded-lg"
                fallbackClassName="bg-gray-200 text-gray-500 rounded-lg"
              />
            </div>
          </motion.div>

          {/* Details Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Store Badge */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs sm:text-sm font-medium text-gray-700">
                {deal.store}
              </span>
              {deal.verified && (
                <span className="flex items-center gap-1 text-green-600 text-xs sm:text-sm font-medium">
                  <BadgeCheck className="h-4 w-4" />
                  Verified
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{deal.title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-base sm:text-lg font-semibold text-gray-900">{deal.rating}</span>
              </div>
              <span className="text-gray-500 text-sm sm:text-base">({deal.reviews.toLocaleString()} reviews)</span>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl p-4 sm:p-6">
              <div className="flex items-baseline gap-2 sm:gap-3 mb-2">
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  ${deal.discountedPrice}
                </span>
                <span className="text-base sm:text-lg md:text-xl text-gray-500 line-through">
                  ${deal.originalPrice}
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                <span className="inline-block px-2 sm:px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-full font-bold text-sm sm:text-base">
                  {deal.discount}% OFF
                </span>
                <span className="text-green-600 font-semibold text-sm sm:text-base">
                  Save ${(deal.originalPrice - deal.discountedPrice).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Published Time */}
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-gray-500 text-xs sm:text-sm mr-1">Published:</span>
              <span className="font-medium text-sm sm:text-base">{deal.publishedAt}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleGetDeal}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-base sm:text-lg py-5 sm:py-6 min-h-[44px]"
              >
                Get Deal
                <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              </Button>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => toast({ title: "Added to Favorites", description: "Deal saved to your favorites!" })}
                  className="min-h-[44px] text-sm sm:text-base"
                >
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Save Deal</span>
                  <span className="sm:hidden">Save</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-5 w-5 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Share this deal</h3>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare('facebook')}
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare('twitter')}
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare('email')}
                >
                  <Mail className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare('share2')}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Category</h3>
              <Link to={`/?category=${deal.category}`}>
                <span className="inline-block px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 transition-colors">
                  {deal.category}
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DealDetail;
