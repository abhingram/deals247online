import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const DealReviews = ({ dealId }) => {
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  });

  useEffect(() => {
    loadReviews();
    if (isAuthenticated && user) {
      loadUserRatingAndReview();
    }
  }, [dealId, isAuthenticated, user]);

  const loadReviews = async () => {
    try {
      const data = await api.getDealReviews(dealId);
      setReviews(data.reviews || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserRatingAndReview = async () => {
    try {
      const data = await api.getDealReviews(dealId);
      if (data.userRating) {
        setUserRating(data.userRating);
      }
      if (data.userReview) {
        setUserReview(data.userReview);
      }
    } catch (error) {
      console.error('Error loading user rating/review:', error);
    }
  };

  const handleRatingSubmit = async (rating) => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to rate deals.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await api.submitDealRating(dealId, rating);
      setUserRating({ rating, created_at: new Date().toISOString() });
      toast({
        title: 'Rating submitted',
        description: 'Thank you for rating this deal!'
      });
      // Reload reviews to update summary
      loadReviews();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit rating.',
        variant: 'destructive'
      });
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to write reviews.',
        variant: 'destructive'
      });
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast({
        title: 'Review required',
        description: 'Please write a review comment.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const reviewData = {
        rating: reviewForm.rating,
        title: reviewForm.title.trim(),
        comment: reviewForm.comment.trim()
      };

      await api.submitDealReview(dealId, reviewData);

      // Reset form and reload
      setReviewForm({ rating: 5, title: '', comment: '' });
      setShowReviewForm(false);
      setUserReview({
        ...reviewData,
        created_at: new Date().toISOString(),
        helpful_votes: 0
      });

      toast({
        title: 'Review submitted',
        description: 'Thank you for your review!'
      });

      // Reload reviews
      loadReviews();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit review.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (reviewId, voteType) => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to vote on reviews.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await api.voteOnReview(reviewId, voteType);

      // Update local state
      setReviews(reviews.map(review =>
        review.id === reviewId
          ? { ...review, helpful_votes: review.helpful_votes + (voteType === 'helpful' ? 1 : 0) }
          : review
      ));

      toast({
        title: 'Vote recorded',
        description: 'Thank you for your feedback!'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record vote.',
        variant: 'destructive'
      });
    }
  };

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate && onRate(star)}
            className={`text-lg ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`h-4 w-4 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Customer Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{summary.avg_rating?.toFixed(1) || '0.0'}</div>
                {renderStars(Math.round(summary.avg_rating || 0))}
                <div className="text-sm text-gray-500 mt-1">
                  {summary.total_reviews} review{summary.total_reviews !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = summary[`${stars}_star`] || 0;
                  const percentage = summary.total_reviews > 0 ? (count / summary.total_reviews) * 100 : 0;

                  return (
                    <div key={stars} className="flex items-center gap-2 text-sm">
                      <span className="w-8">{stars}★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-right text-gray-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Rating Section */}
            {isAuthenticated && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Rating:</span>
                  {userRating ? (
                    <div className="flex items-center gap-2">
                      {renderStars(userRating.rating)}
                      <span className="text-sm text-gray-500">
                        Rated on {new Date(userRating.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500 mr-2">Rate this deal:</span>
                      {renderStars(0, true, handleRatingSubmit)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Write Review Button */}
      {isAuthenticated && !userReview && (
        <div className="text-center">
          <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <MessageSquare className="h-4 w-4 mr-2" />
                Write a Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Write a Review</DialogTitle>
                <DialogDescription>
                  Share your experience with this deal
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <div className="mt-1">
                    {renderStars(reviewForm.rating, true, (rating) =>
                      setReviewForm(prev => ({ ...prev, rating }))
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Review Title (Optional)</Label>
                  <input
                    id="title"
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Summarize your review"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <Label htmlFor="comment">Review</Label>
                  <textarea
                    id="comment"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Tell others about your experience..."
                    rows={4}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReviewForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* User's Review */}
      {userReview && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg">Your Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {renderStars(userReview.rating)}
                {userReview.title && (
                  <span className="font-medium">{userReview.title}</span>
                )}
              </div>
              <p className="text-gray-700">{userReview.comment}</p>
              <div className="text-sm text-gray-500">
                Posted on {new Date(userReview.created_at).toLocaleDateString()}
                {userReview.verified_purchase && (
                  <span className="ml-2 text-green-600">✓ Verified Purchase</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Customer Reviews</h3>
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                          {review.verified_purchase && (
                            <span className="text-xs text-green-600 font-medium">Verified Purchase</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {review.display_name || 'Anonymous'} • {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {review.title && (
                    <h4 className="font-medium text-gray-900">{review.title}</h4>
                  )}

                  <p className="text-gray-700">{review.comment}</p>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{review.helpful_votes || 0} helpful</span>
                    </div>

                    {isAuthenticated && review.user_vote_count === 0 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleVote(review.id, 'helpful')}
                          className="text-sm text-gray-500 hover:text-green-600 flex items-center gap-1"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          Helpful
                        </button>
                        <button
                          onClick={() => handleVote(review.id, 'not_helpful')}
                          className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 ml-2"
                        >
                          <ThumbsDown className="h-3 w-3" />
                          Not helpful
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviews.length === 0 && !loading && (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No reviews yet</p>
          <p className="text-gray-400 text-sm mt-2">Be the first to review this deal!</p>
        </div>
      )}
    </div>
  );
};

export default DealReviews;