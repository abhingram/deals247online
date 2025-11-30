import express from 'express';
import db from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get ratings and reviews for a deal
router.get('/deal/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;
    const { page = 1, limit = 10, sortBy = 'created_at', order = 'desc' } = req.query;

    const offset = (page - 1) * limit;
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get reviews with user info
    const [reviews] = await db.query(`
      SELECT
        r.id,
        r.rating,
        r.title,
        r.comment,
        r.verified_purchase,
        r.helpful_votes,
        r.created_at,
        u.display_name,
        u.email,
        COUNT(rv.id) as user_vote_count
      FROM deal_reviews r
      LEFT JOIN users u ON r.user_id = u.firebase_uid
      LEFT JOIN deal_review_votes rv ON r.id = rv.review_id AND rv.user_id = ?
      WHERE r.deal_id = ?
      GROUP BY r.id, r.rating, r.title, r.comment, r.verified_purchase, r.helpful_votes, r.created_at, u.display_name, u.email
      ORDER BY r.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [req.user?.uid || null, dealId, parseInt(limit), offset]);

    // Get rating summary
    const [ratingSummary] = await db.query(`
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM deal_reviews
      WHERE deal_id = ?
    `, [dealId]);

    res.json({
      reviews,
      summary: ratingSummary[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ratingSummary[0].total_reviews
      }
    });
  } catch (error) {
    console.error('Error fetching deal reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Add or update rating
router.post('/deal/:dealId/rating', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.params;
    const { rating } = req.body;
    const userId = req.user.uid;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if deal exists
    const [deal] = await db.query('SELECT id FROM deals WHERE id = ? AND deleted_at IS NULL', [dealId]);
    if (deal.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Insert or update rating
    await db.query(`
      INSERT INTO deal_ratings (user_id, deal_id, rating)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = VALUES(rating), updated_at = CURRENT_TIMESTAMP
    `, [userId, dealId, rating]);

    // Update deal's rating stats
    await updateDealRatingStats(dealId);

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Add review
router.post('/deal/:dealId/review', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user.uid;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Review comment is required' });
    }

    // Check if deal exists
    const [deal] = await db.query('SELECT id FROM deals WHERE id = ? AND deleted_at IS NULL', [dealId]);
    if (deal.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if user has purchased (for verified purchase - placeholder logic)
    const [hasViewed] = await db.query(
      'SELECT COUNT(*) as views FROM deal_views WHERE user_id = ? AND deal_id = ?',
      [userId, dealId]
    );
    const verifiedPurchase = hasViewed[0].views > 0;

    // Insert review
    const [result] = await db.query(`
      INSERT INTO deal_reviews (user_id, deal_id, rating, title, comment, verified_purchase)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, dealId, rating, title || '', comment, verifiedPurchase]);

    // Insert or update rating
    await db.query(`
      INSERT INTO deal_ratings (user_id, deal_id, rating)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = VALUES(rating), updated_at = CURRENT_TIMESTAMP
    `, [userId, dealId, rating]);

    // Update deal's rating stats
    await updateDealRatingStats(dealId);

    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: result.insertId
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Vote on review helpfulness
router.post('/review/:reviewId/vote', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { voteType } = req.body; // 'helpful' or 'not_helpful'
    const userId = req.user.uid;

    if (!['helpful', 'not_helpful'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Check if review exists
    const [review] = await db.query('SELECT id FROM deal_reviews WHERE id = ?', [reviewId]);
    if (review.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Insert or update vote
    await db.query(`
      INSERT INTO deal_review_votes (user_id, review_id, vote_type)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type), created_at = CURRENT_TIMESTAMP
    `, [userId, reviewId, voteType]);

    // Update helpful votes count
    const [helpfulCount] = await db.query(`
      SELECT COUNT(*) as helpful FROM deal_review_votes
      WHERE review_id = ? AND vote_type = 'helpful'
    `, [reviewId]);

    await db.query(
      'UPDATE deal_reviews SET helpful_votes = ? WHERE id = ?',
      [helpfulCount[0].helpful, reviewId]
    );

    res.json({ message: 'Vote submitted successfully' });
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

// Get user's rating and review for a deal
router.get('/deal/:dealId/user', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.uid;

    const [rating] = await db.query(
      'SELECT rating, created_at FROM deal_ratings WHERE user_id = ? AND deal_id = ?',
      [userId, dealId]
    );

    const [review] = await db.query(
      'SELECT * FROM deal_reviews WHERE user_id = ? AND deal_id = ?',
      [userId, dealId]
    );

    res.json({
      rating: rating[0] || null,
      review: review[0] || null
    });
  } catch (error) {
    console.error('Error fetching user rating/review:', error);
    res.status(500).json({ error: 'Failed to fetch user rating/review' });
  }
});

// Helper function to update deal rating statistics
async function updateDealRatingStats(dealId) {
  try {
    const [stats] = await db.query(`
      SELECT
        COUNT(*) as total_ratings,
        AVG(rating) as avg_rating
      FROM deal_ratings
      WHERE deal_id = ?
    `, [dealId]);

    const totalRatings = stats[0].total_ratings;
    const avgRating = stats[0].avg_rating || 0;

    // Count reviews (reviews are separate from ratings)
    const [reviewCount] = await db.query(
      'SELECT COUNT(*) as total_reviews FROM deal_reviews WHERE deal_id = ?',
      [dealId]
    );

    await db.query(`
      UPDATE deals
      SET total_ratings = ?, total_reviews = ?, avg_rating = ?
      WHERE id = ?
    `, [totalRatings, reviewCount[0].total_reviews, avgRating, dealId]);
  } catch (error) {
    console.error('Error updating deal rating stats:', error);
    throw error;
  }
}

export default router;