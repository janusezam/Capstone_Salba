// utils/groqService.js
const Groq = require('groq-sdk').default;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'gsk_test_key'
});

/**
 * Analyzes multiple critical reports and prioritizes them
 * @param {Array} criticalReports - Array of critical reports with note, type, location, timestamp
 * @param {String} language - Language code (e.g., 'en', 'fil' for Bisaya/Filipino)
 * @returns {Object} Prioritized analysis with recommendations
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

    // Format reports for analysis
    const reportsContext = criticalReports
      .map((report, idx) => {
        return `
Report ${idx + 1}:
- ID: ${report._id}
- Type: ${report.disasterType}
- Location: ${report.locationName || 'Unknown'}
- Note: ${report.note || 'No additional notes'}
- Time: ${new Date(report.createdAt).toLocaleString()}
- Status: ${report.status}
- Assigned Team: ${report.assignedTeam ? 'Yes' : 'No'}
`;
      })
      .join('\n');

    const languageInstruction = 
      language === 'fil' || language === 'bisaya' 
        ? 'Respond in Filipino/Bisaya. Use practical language for emergency responders.'
        : 'Respond in English. Use practical language for emergency responders.';

    const prompt = `
You are an emergency response prioritization AI. Analyze these CRITICAL reports and determine response priority order.

${reportsContext}

${languageInstruction}

PRIORITIZATION CRITERIA (in order of importance):
1. IMMEDIATE DANGER to life/public safety
2. Active ongoing situation (fire, flood, medical emergency)
3. Proximity to populated areas
4. Availability of resources
5. Report timestamp (older = consider higher priority if conditions similar)

ANALYSIS REQUIREMENTS:
- Look for keywords in notes indicating urgency: "active", "ongoing", "spreading", "many people", "trapped", "unconscious", etc.
- Consider disaster type severity: Fire > Medical > Flood > Landslide > Missing Person > Other
- If notes mention multiple casualties or large area = HIGH PRIORITY

RESPOND WITH EXACT JSON FORMAT (no markdown, just JSON):
{
  "analysisComplete": true,
  "priorityOrder": [
    {
      "reportId": "ID",
      "priority": 1,
      "reason": "Brief reason for priority",
      "urgencyScore": 9.5,
      "recommendation": "What responders should do"
    }
  ],
  "overallRecommendation": "Top 3 actions to take immediately",
  "estimatedResponseTime": "Estimated time to get resources to each location"
}
`;

    console.log('🤖 Groq Analysis Request - Analyzing', criticalReports.length, 'critical reports');

    const message = await groq.messages.create({
      model: 'mixtral-8x7b-32768',
      max_tokens: 2000,
      system: 'You are an expert emergency response coordinator. Your goal is to help emergency managers prioritize response to critical incidents. Return ONLY valid JSON, no markdown formatting.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract response
    let responseText = message.content[0].text;
    
    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    let analysisResult = JSON.parse(responseText.trim());

    console.log('✅ Groq Analysis Complete');
    return {
      success: true,
      analysis: analysisResult,
      timestamp: new Date(),
      reportCount: criticalReports.length
    };

  } catch (error) {
    console.error('❌ Groq Analysis Error:', error.message);
    
    // Fallback to time-based priority if Groq fails
    const fallbackAnalysis = generateFallbackPriority(criticalReports);
    return {
      success: false,
      error: error.message,
      analysis: fallbackAnalysis,
      fallback: true,
      timestamp: new Date()
    };
  }
}

/**
 * Generates fallback priority if Groq API fails
 */
function generateFallbackPriority(reports) {
  const priorityMap = {
    'fire': 10,
    'medical': 9,
    'flood': 8,
    'landslide': 7,
    'missing': 6,
    'other': 5
  };

  const scored = reports.map(report => {
    const baseScore = priorityMap[report.disasterType?.toLowerCase()] || 5;
    const urgencyKeywords = ['active', 'ongoing', 'spreading', 'trapped', 'unconscious', 'critical'];
    const hasUrgencyKeywords = urgencyKeywords.some(kw => 
      report.note?.toLowerCase().includes(kw)
    );
    
    const finalScore = hasUrgencyKeywords ? baseScore + 2 : baseScore;
    const timeWeight = (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60); // minutes
    
    return {
      reportId: report._id,
      priority: null, // Will be set after sorting
      reason: `${report.disasterType} incident${hasUrgencyKeywords ? ' with active threat indicators' : ''}`,
      urgencyScore: Math.min(finalScore + (timeWeight * 0.1), 10),
      recommendation: `Dispatch team to ${report.locationName}. Status: ${report.status}`
    };
  });

  // Sort by urgency score descending
  scored.sort((a, b) => b.urgencyScore - a.urgencyScore);

  // Assign priority order
  scored.forEach((item, idx) => {
    item.priority = idx + 1;
  });

  return {
    analysisComplete: true,
    priorityOrder: scored,
    overallRecommendation: `Prioritize top ${Math.min(3, scored.length)} reports. Ensure public safety first.`,
    estimatedResponseTime: 'Based on current team availability'
  };
}

/**
 * Translate Bisaya/Filipino text to English and back
 * Uses free Groq API for translation (fast and free)
 */
async function translateBisaya(text, targetLanguage = 'en') {
  try {
    if (!text) return text;

    const translatePrompt = 
      targetLanguage === 'en'
        ? `Translate this Bisaya/Cebuano/Filipino text to English. Return ONLY the translation, no explanation. Text: "${text}"`
        : `Translate this English text to natural Bisaya/Cebuano/Filipino. Return ONLY the translation, no explanation. Text: "${text}"`;

    const message = await groq.messages.create({
      model: 'mixtral-8x7b-32768',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: translatePrompt
        }
      ]
    });

    return message.content[0].text.trim();

  } catch (error) {
    console.error('Translation error:', error.message);
    return text; // Return original if translation fails
  }
}

module.exports = {
  analyzeCriticalReports,
  translateBisaya,
  generateFallbackPriority
};
