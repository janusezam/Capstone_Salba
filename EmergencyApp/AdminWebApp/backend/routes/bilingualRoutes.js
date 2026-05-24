const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const BilingualTerm = require('../models/BilingualTerm');
const { 
  analyzeCriticalReports, 
  translateDisasterText,
  findDisasterKeywords,
  getBilingualContext 
} = require('../utils/groqServiceBilingual');

const router = express.Router();

/**
 * Get all bilingual disaster terms
 */
router.get('/terms', async (req, res) => {
  try {
    const terms = await BilingualTerm.find().sort({ urgencyScore: -1 });
    res.json({
      success: true,
      count: terms.length,
      terms
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get terms by urgency level
 */
router.get('/terms/urgency/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const minUrgency = parseInt(level) || 5;
    
    const terms = await BilingualTerm.find({ urgencyScore: { $gte: minUrgency } })
      .sort({ urgencyScore: -1 });
    
    res.json({
      success: true,
      minUrgency,
      count: terms.length,
      terms
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get terms by category
 */
router.get('/terms/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const terms = await BilingualTerm.find({ 
      category: new RegExp(category, 'i') 
    }).sort({ urgencyScore: -1 });
    
    res.json({
      success: true,
      category,
      count: terms.length,
      terms
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search for disaster keywords in text
 * POST /api/bilingual/search-keywords
 */
router.post('/search-keywords', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const keywords = await findDisasterKeywords(text);
    
    res.json({
      success: true,
      inputText: text,
      foundTerms: keywords.length,
      keywords: keywords.map(k => ({
        english: k.english,
        bisaya: k.bisaya,
        category: k.category,
        urgencyScore: k.urgencyScore,
        example: k.exampleSentence
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Translate emergency text (English ↔ Bisaya)
 * POST /api/bilingual/translate
 */
router.post('/translate', authMiddleware, async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const translation = await translateDisasterText(text, targetLanguage || 'en');
    res.json(translation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analyze with bilingual support
 * POST /api/bilingual/analyze-priority
 */
router.post('/analyze-priority', authMiddleware, async (req, res) => {
  try {
    const { language = 'en' } = req.body;
    
    // Get critical reports (you'll need to adapt this to your Report model)
    const Report = require('../models/Report');
    const criticalReports = await Report.find({ severity: 'CRITICAL' })
      .limit(10)
      .sort({ createdAt: -1 });

    if (criticalReports.length === 0) {
      return res.json({
        success: true,
        message: 'No critical reports to analyze',
        recommendations: []
      });
    }

    const analysis = await analyzeCriticalReports(criticalReports, language);
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get bilingual context reference
 * GET /api/bilingual/context
 */
router.get('/context', authMiddleware, async (req, res) => {
  try {
    const context = await getBilingualContext();
    
    res.json({
      success: true,
      context
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get statistics about bilingual dataset
 * GET /api/bilingual/stats
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await BilingualTerm.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgUrgency: { $avg: '$urgencyScore' },
          maxUrgency: { $max: '$urgencyScore' },
          totalUsage: { $sum: '$usage_count' }
        }
      },
      { $sort: { avgUrgency: -1 } }
    ]);

    const totalTerms = await BilingualTerm.countDocuments();
    const highUrgencyTerms = await BilingualTerm.countDocuments({ urgencyScore: { $gte: 8 } });

    res.json({
      success: true,
      totalTerms,
      highUrgencyTerms,
      categoryStats: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update term urgency score (Admin only)
 * PATCH /api/bilingual/terms/:termId
 */
router.patch('/terms/:termId', authMiddleware, async (req, res) => {
  try {
    const { urgencyScore } = req.body;
    
    if (urgencyScore < 1 || urgencyScore > 10) {
      return res.status(400).json({ error: 'Urgency score must be between 1 and 10' });
    }

    const term = await BilingualTerm.findByIdAndUpdate(
      req.params.termId,
      { urgencyScore, updatedAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      term
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
