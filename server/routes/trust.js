import express from 'express';
import db from '../database/connection.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get trust indicators overview
router.get('/indicators', authenticateAdmin, async (req, res) => {
  try {
    // Get overall trust statistics
    const [overallStats] = await db.execute(`
      SELECT
        COUNT(*) as total_deals,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_deals,
        AVG(trust_score) as avg_trust_score,
        COUNT(CASE WHEN trust_score >= 8.0 THEN 1 END) as high_trust_deals,
        COUNT(CASE WHEN trust_score < 5.0 THEN 1 END) as low_trust_deals
      FROM deals
      WHERE deleted = 0
    `);

    // Get store reliability data
    const [storeReliability] = await db.execute(`
      SELECT * FROM store_reliability
      ORDER BY trust_score DESC
      LIMIT 20
    `);

    // Get recent verifications
    const [recentVerifications] = await db.execute(`
      SELECT dv.*, d.title as deal_title, d.store, u.display_name as verified_by_name
      FROM deal_verifications dv
      JOIN deals d ON dv.deal_id = d.id
      LEFT JOIN users u ON dv.verified_by = u.firebase_uid
      ORDER BY dv.created_at DESC
      LIMIT 10
    `);

    res.json({
      overall: overallStats[0],
      store_reliability: storeReliability,
      recent_verifications: recentVerifications
    });
  } catch (error) {
    console.error('Error fetching trust indicators:', error);
    res.status(500).json({ error: 'Failed to fetch trust indicators' });
  }
});

// Verify a deal
router.post('/deals/:dealId/verify', authenticateAdmin, async (req, res) => {
  try {
    const { dealId } = req.params;
    const { verification_status, verification_notes, trust_score } = req.body;
    const firebaseUid = req.user.uid;

    // Check if deal exists
    const [deals] = await db.execute('SELECT * FROM deals WHERE id = ? AND deleted = 0', [dealId]);
    if (deals.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Create or update verification record
    const verifiedAt = verification_status === 'verified' ? new Date() : null;

    await db.execute(`
      INSERT INTO deal_verifications (deal_id, verified_by, verification_status, verification_notes, trust_score, verified_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        verified_by = VALUES(verified_by),
        verification_status = VALUES(verification_status),
        verification_notes = VALUES(verification_notes),
        trust_score = VALUES(trust_score),
        verified_at = VALUES(verified_at),
        updated_at = CURRENT_TIMESTAMP
    `, [dealId, firebaseUid, verification_status, verification_notes, trust_score, verifiedAt]);

    // Update deal verification status
    await db.execute(`
      UPDATE deals
      SET verified = ?, trust_score = ?, verification_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [verification_status === 'verified' ? 1 : 0, trust_score, verifiedAt, dealId]);

    // Update store reliability if deal is verified
    if (verification_status === 'verified') {
      await updateStoreReliability(deals[0].store);
    }

    res.json({
      message: `Deal ${verification_status} successfully`,
      deal_id: dealId,
      verification_status,
      trust_score
    });
  } catch (error) {
    console.error('Error verifying deal:', error);
    res.status(500).json({ error: 'Failed to verify deal' });
  }
});

// Get store reliability data
router.get('/stores/reliability', authenticateAdmin, async (req, res) => {
  try {
    const [stores] = await db.execute(`
      SELECT * FROM store_reliability
      ORDER BY trust_score DESC
    `);

    res.json(stores);
  } catch (error) {
    console.error('Error fetching store reliability:', error);
    res.status(500).json({ error: 'Failed to fetch store reliability' });
  }
});

// Update store reliability for a specific store
router.post('/stores/:storeName/reliability', authenticateAdmin, async (req, res) => {
  try {
    const { storeName } = req.params;

    await updateStoreReliability(storeName);

    res.json({ message: 'Store reliability updated successfully' });
  } catch (error) {
    console.error('Error updating store reliability:', error);
    res.status(500).json({ error: 'Failed to update store reliability' });
  }
});

// Get deal verification history
router.get('/deals/:dealId/verifications', authenticateAdmin, async (req, res) => {
  try {
    const { dealId } = req.params;

    const [verifications] = await db.execute(`
      SELECT dv.*, u.display_name as verified_by_name
      FROM deal_verifications dv
      LEFT JOIN users u ON dv.verified_by = u.firebase_uid
      WHERE dv.deal_id = ?
      ORDER BY dv.created_at DESC
    `, [dealId]);

    res.json(verifications);
  } catch (error) {
    console.error('Error fetching deal verifications:', error);
    res.status(500).json({ error: 'Failed to fetch deal verifications' });
  }
});

// Bulk verify deals
router.post('/deals/bulk-verify', authenticateAdmin, async (req, res) => {
  try {
    const { dealIds, verification_status, verification_notes, trust_score } = req.body;
    const firebaseUid = req.user.uid;

    if (!Array.isArray(dealIds) || dealIds.length === 0) {
      return res.status(400).json({ error: 'dealIds array is required' });
    }

    const verifiedAt = verification_status === 'verified' ? new Date() : null;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const dealId of dealIds) {
      try {
        // Create verification record
        await db.execute(`
          INSERT INTO deal_verifications (deal_id, verified_by, verification_status, verification_notes, trust_score, verified_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            verified_by = VALUES(verified_by),
            verification_status = VALUES(verification_status),
            verification_notes = VALUES(verification_notes),
            trust_score = VALUES(trust_score),
            verified_at = VALUES(verified_at),
            updated_at = CURRENT_TIMESTAMP
        `, [dealId, firebaseUid, verification_status, verification_notes, trust_score, verifiedAt]);

        // Update deal
        await db.execute(`
          UPDATE deals
          SET verified = ?, trust_score = ?, verification_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [verification_status === 'verified' ? 1 : 0, trust_score, verifiedAt, dealId]);

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ deal_id: dealId, error: error.message });
      }
    }

    // Update store reliabilities for affected stores
    if (verification_status === 'verified') {
      const [affectedStores] = await db.execute(`
        SELECT DISTINCT store FROM deals WHERE id IN (${dealIds.map(() => '?').join(',')})
      `, dealIds);

      for (const store of affectedStores) {
        await updateStoreReliability(store.store);
      }
    }

    res.json({
      message: `Bulk verification completed: ${successCount} successful, ${errorCount} failed`,
      success_count: successCount,
      error_count: errorCount,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    console.error('Error in bulk verification:', error);
    res.status(500).json({ error: 'Failed to perform bulk verification' });
  }
});

// Helper function to update store reliability
async function updateStoreReliability(storeName) {
  try {
    // Get store statistics
    const [stats] = await db.execute(`
      SELECT
        COUNT(*) as total_deals,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_deals,
        AVG(rating) as avg_rating,
        SUM(total_ratings) as total_ratings,
        SUM(total_reviews) as total_reviews,
        AVG(avg_rating) as avg_deal_rating
      FROM deals
      WHERE store = ? AND deleted = 0
    `, [storeName]);

    const stat = stats[0];
    if (stat.total_deals === 0) return;

    // Calculate trust score (weighted formula)
    const verificationRatio = stat.verified_deals / stat.total_deals;
    const ratingScore = (stat.avg_deal_rating || 0) / 5; // Normalize to 0-1
    const trustScore = Math.round(((verificationRatio * 0.6 + ratingScore * 0.4) * 10) * 100) / 100;

    // Update or insert store reliability
    await db.execute(`
      INSERT INTO store_reliability (store_name, total_deals, verified_deals, total_ratings, total_reviews, avg_rating, trust_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_deals = VALUES(total_deals),
        verified_deals = VALUES(verified_deals),
        total_ratings = VALUES(total_ratings),
        total_reviews = VALUES(total_reviews),
        avg_rating = VALUES(avg_rating),
        trust_score = VALUES(trust_score)
    `, [
      storeName,
      stat.total_deals,
      stat.verified_deals,
      stat.total_ratings || 0,
      stat.total_reviews || 0,
      stat.avg_deal_rating || 0,
      trustScore
    ]);
  } catch (error) {
    console.error('Error updating store reliability:', error);
  }
}

export default router;