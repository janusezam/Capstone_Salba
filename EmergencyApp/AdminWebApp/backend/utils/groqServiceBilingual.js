const Groq = require('groq-sdk').default;
const BilingualTerm = require('../models/BilingualTerm');

// Simple logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err?.message || ''),
  warn: (msg) => console.warn(`[WARN] ${msg}`)
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'gsk_test_key'
});

/**
 * Search for disaster keywords in bilingual dataset
 * @param {String} text - Text to search (English or Bisaya)
 * @returns {Array} Matching bilingual terms with urgency scores
 */
async function findDisasterKeywords(text) {
  try {
    const searchTerms = text.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const matches = await BilingualTerm.find({
      $or: [
        { keywords: { $in: searchTerms } },
        { english: { $regex: searchTerms.join('|'), $options: 'i' } },
        { bisaya: { $regex: searchTerms.join('|'), $options: 'i' } },
        { tagalog: { $regex: searchTerms.join('|'), $options: 'i' } }
      ]
    });

    return matches.sort((a, b) => b.urgencyScore - a.urgencyScore);
  } catch (error) {
    logger.error('Error searching disaster keywords:', error);
    return [];
  }
}

/**
 * Get bilingual context for Groq AI
 * @returns {String} Formatted bilingual terminology reference
 */
async function getBilingualContext() {
  try {
    const highUrgency = await BilingualTerm.find({ urgencyScore: { $gte: 8 } }).limit(15);
    const mediumUrgency = await BilingualTerm.find({ urgencyScore: { $gte: 5, $lt: 8 } }).limit(10);

    let context = `BILINGUAL EMERGENCY TERMINOLOGY REFERENCE:

🔴 HIGH URGENCY TERMS (Immediate Response Required):
`;
    
    highUrgency.forEach(term => {
      context += `  • ENGLISH: ${term.english} / BISAYA: ${term.bisaya} [Score: ${term.urgencyScore}/10]\n`;
    });

    context += `\n🟠 MEDIUM URGENCY TERMS:
`;
    
    mediumUrgency.forEach(term => {
      context += `  • ENGLISH: ${term.english} / BISAYA: ${term.bisaya} [Score: ${term.urgencyScore}/10]\n`;
    });

    return context;
  } catch (error) {
    logger.error('Error getting bilingual context:', error);
    return '';
  }
}

/**
 * Analyze critical reports with bilingual support
 * @param {Array} criticalReports - Critical reports to analyze
 * @param {String} language - 'en' (English) or 'fil' (Filipino/Bisaya)
 * @returns {Object} Prioritized analysis
 */
async function analyzeCriticalReports(criticalReports, language = 'en') {
  try {
    if (!criticalReports || criticalReports.length === 0) {
      return {
        success: false,
        message: 'No critical reports to analyze',
        recommendations: []
      };
    }

    // Enhance reports with keyword matching
    const enhancedReports = await Promise.all(
      criticalReports.map(async (report) => {
        const keywords = await findDisasterKeywords(report.note || '');
        const maxUrgency = keywords.length > 0 ? Math.max(...keywords.map(k => k.urgencyScore)) : 5;
        
        return {
          ...report,
          detectedTerms: keywords.slice(0, 3),
          AI_urgencyScore: maxUrgency
        };
      })
    );

    // Format reports for Groq
    const reportsContext = enhancedReports
      .map((report, idx) => `
Report ${idx + 1}:
- ID: ${report._id}
- Type: ${report.disasterType}
- Location: ${report.locationName || 'Unknown'}
- Note: ${report.note || 'No additional notes'}
- Detected Terms: ${report.detectedTerms.map(t => `${t.english}/${t.bisaya}`).join(', ') || 'None'}
- AI Urgency Score: ${report.AI_urgencyScore}/10
- Time: ${new Date(report.createdAt).toLocaleString()}
- Status: ${report.status}
- Affected Count: ${report.affectedCount || 0}
`)
      .join('\n');

    // Get bilingual context
    const bilingualContext = await getBilingualContext();

    // Language instructions
    const languageInstructions = language === 'fil' || language === 'bisaya'
      ? `Respond in Filipino/Bisaya (Cebuano). Use practical language for emergency responders.
Key Terms - Death: Patay/Kamatayan | Injuries: Samad/Tama | Fire: Apoy/Sunog | Flood: Baha | Missing: Nawala`
      : 'Respond in English. Use clear, direct language for emergency responders.';

    const prompt = `You are an expert emergency response prioritization AI with bilingual expertise.

${bilingualContext}

CRITICAL INCIDENT REPORTS TO PRIORITIZE:
${reportsContext}

INSTRUCTIONS:
1. Analyze the ${enhancedReports.length} critical reports
2. Use the AI Urgency Scores and Detected Terms as primary indicators
3. Consider affected count, location clustering, and resource availability
4. Provide recommendation order (highest priority first)
5. ${languageInstructions}

RESPONSE FORMAT:
Priority 1: [Report ID] - [Reason] (Urgency: X/10)
Priority 2: [Report ID] - [Reason] (Urgency: X/10)
Priority 3: [Report ID] - [Reason] (Urgency: X/10)
Overall: [One sentence strategic recommendation in chosen language]`;

    // Call Groq API
    const message = await groq.messages.create({
      model: 'mixtral-8x7b-32768',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Parse response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Extract priorities
    const lines = responseText.split('\n');
    const priorityOrder = [];
    let overallRecommendation = '';

    lines.forEach(line => {
      if (line.includes('Priority') && !line.includes('Overall')) {
        priorityOrder.push(line.trim());
      }
      if (line.includes('Overall:')) {
        overallRecommendation = line.replace('Overall:', '').trim();
      }
    });

    // Update usage stats
    for (const report of enhancedReports) {
      if (report.detectedTerms.length > 0) {
        await BilingualTerm.updateMany(
          { _id: { $in: report.detectedTerms.map(t => t._id) } },
          { $inc: { usage_count: 1 } }
        );
      }
    }

    return {
      success: true,
      analysisTimestamp: new Date().toISOString(),
      language: language,
      reportCount: enhancedReports.length,
      priorityOrder: priorityOrder,
      overallRecommendation: overallRecommendation,
      detectedDisasterTerms: enhancedReports.flatMap(r => r.detectedTerms.map(t => ({
        english: t.english,
        bisaya: t.bisaya,
        urgencyScore: t.urgencyScore,
        category: t.category
      }))),
      fallback: false,
      groqResponse: responseText
    };
  } catch (error) {
    logger.error('Error in analyzeCriticalReports:', error);
    return {
      success: false,
      message: 'AI analysis failed, using fallback prioritization',
      fallback: true,
      error: error.message
    };
  }
}

/**
 * Translate emergency text between English and Bisaya
 * @param {String} text - Text to translate
 * @param {String} targetLanguage - Target language ('en' or 'bisaya')
 * @returns {Object} Translation result
 */
async function translateDisasterText(text, targetLanguage = 'en') {
  try {
    const sourceLanguage = targetLanguage === 'en' ? 'bisaya' : 'en';
    
    const messages = await groq.messages.create({
      model: 'mixtral-8x7b-32768',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Translate this emergency dispatch message from ${sourceLanguage === 'en' ? 'English' : 'Bisaya/Cebuano'} to ${targetLanguage === 'en' ? 'English' : 'Bisaya/Cebuano'}. Keep it concise and practical for responders:

"${text}"

Provide only the translation, no explanation.`
        }
      ]
    });

    return {
      success: true,
      original: text,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      translation: messages.content[0].type === 'text' ? messages.content[0].text : '',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error translating text:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  analyzeCriticalReports,
  translateDisasterText,
  findDisasterKeywords,
  getBilingualContext
};
