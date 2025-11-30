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
        expiresIn: calculateExpiresIn(response.expires_at),
        verified: Boolean(response.verified),
        createdAt: new Date(response.created_at),
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

  const calculateExpiresIn = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires in 1 day';
    return `Expires in ${diffDays} days`;
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
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
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
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
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
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link to="/" className="hover:text-orange-600">Home</Link>
          <span>/</span>
          <Link to={`/?category=${deal.category}`} className="hover:text-orange-600">{deal.category}</Link>
          <span>/</span>
          <span className="text-gray-900">{deal.title}</span>
        </nav>

        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4">
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
            className="space-y-6"
          >
            {/* Store Badge */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                {deal.store}
              </span>
              {deal.verified && (
                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <BadgeCheck className="h-4 w-4" />
                  Verified
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900">{deal.title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-semibold text-gray-900">{deal.rating}</span>
              </div>
              <span className="text-gray-500">({deal.reviews.toLocaleString()} reviews)</span>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-gray-900">
                  ${deal.discountedPrice}
                </span>
                <span className="text-xl text-gray-500 line-through">
                  ${deal.originalPrice}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-full font-bold">
                  {deal.discount}% OFF
                </span>
                <span className="text-green-600 font-semibold">
                  Save ${(deal.originalPrice - deal.discountedPrice).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Expiration */}
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              <span className="font-medium">{deal.expiresIn}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleGetDeal}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-lg py-6"
              >
                Get Deal
                <ExternalLink className="h-5 w-5 ml-2" />
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => toast({ title: "Added to Favorites", description: "Deal saved to your favorites!" })}
                >
                  <Heart className="h-5 w-5 mr-2" />
                  Save Deal
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
