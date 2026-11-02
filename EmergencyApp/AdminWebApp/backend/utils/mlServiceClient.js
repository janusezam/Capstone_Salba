/**
 * ML Service Client
 * Integrates with SALBA ML Service v2 (Flask Calibrated Multilingual & Spatial Engine)
 * Provides disaster classification, severity prediction, and false alarm detection
 */

const axios = require('axios');
const crypto = require('crypto');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001/api/ml';

class MLServiceClient {
  constructor() {
    this.baseURL = ML_SERVICE_URL.endsWith('/') ? ML_SERVICE_URL : `${ML_SERVICE_URL}/`;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 3000, // 3s timeout; v2 inference completes in < 15ms
    });
    
    // Simple in-memory cache for predictions (auto-clear every 5 minutes)
    this.predictionCache = new Map();
    setInterval(() => {
      this.predictionCache.clear();
    }, 5 * 60 * 1000);
  }

  /**
   * Generate cache key from report data (including disasterType and cluster count)
   */
  _getCacheKey(description, latitude, longitude, disasterType = '', nearbyReportsCount = 1) {
    const data = `${description || ''}|${latitude}|${longitude}|${disasterType || ''}|${nearbyReportsCount || 1}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Check if ML service is available
   */
  async healthCheck() {
    try {
      const response = await this.client.get('health');
      return {
        success: true,
        status: response.data.status,
        version: response.data.version,
        engine: response.data.engine,
        models: response.data.models,
      };
    } catch (error) {
      // Silently fail - ML service is optional
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Classify disaster type
   * @param {string} description - Report text/description
   * @param {number} latitude - Report latitude
   * @param {number} longitude - Report longitude
   * @param {string} disasterType - Optional user-selected disaster type
   * @returns {Promise<Object>} Classification result with disaster type and confidence
   */
  async classifyDisaster(description, latitude, longitude, disasterType = null) {
    try {
      const response = await this.client.post('classify', {
        description: description || '',
        latitude,
        longitude,
        disaster_type: disasterType,
      });

      return {
        success: true,
        disasterType: response.data.classification,
        confidence: response.data.confidence,
        probabilities: response.data.probabilities,
        recommendation: response.data.recommendation,
      };
    } catch (error) {
      // ML service unavailable - return default
      return {
        success: false,
        error: error.message,
        disasterType: null,
      };
    }
  }

  /**
   * Predict severity level
   * @param {string} description - Report text/description
   * @param {number} textLength - Length of description
   * @param {Object} options - Optional spatial context (latitude, longitude, disasterType, nearbyReportsCount)
   * @returns {Promise<Object>} Severity prediction with level and confidence
   */
  async predictSeverity(description, textLength = null, options = {}) {
    try {
      const desc = description || '';
      const response = await this.client.post('severity', {
        description: desc,
        text_length: textLength != null ? textLength : desc.length,
        latitude: options.latitude,
        longitude: options.longitude,
        disaster_type: options.disasterType,
        nearby_reports_count: options.nearbyReportsCount || 1,
      });

      return {
        success: true,
        severity: response.data.predicted_severity,
        confidence: response.data.confidence,
        probabilities: response.data.probabilities,
        recommendation: response.data.recommendation,
      };
    } catch (error) {
      // ML service unavailable - return default
      return {
        success: false,
        error: error.message,
        severity: null,
      };
    }
  }

  /**
   * Verify if report is legitimate or false alarm
   * @param {string} description - Report text/description
   * @param {number} hasPrankKeywords - Whether prank keywords detected
   * @param {Object} options - Optional spatial context
   * @returns {Promise<Object>} Verification result
   */
  async verifyReport(description, hasPrankKeywords = 0, options = {}) {
    try {
      const response = await this.client.post('verify', {
        description: description || '',
        has_prank_keywords: hasPrankKeywords,
        latitude: options.latitude,
        longitude: options.longitude,
        disaster_type: options.disasterType,
        nearby_reports_count: options.nearbyReportsCount || 1,
      });

      return {
        success: true,
        isLegitimate: response.data.is_legitimate,
        confidence: response.data.confidence,
        recommendation: response.data.recommendation,
      };
    } catch (error) {
      // ML service unavailable - return default
      return {
        success: false,
        error: error.message,
        isLegitimate: true, // Assume legitimate if verification fails
      };
    }
  }

  /**
   * Comprehensive report evaluation
   * @param {Object} reportData - Complete report data
   * @returns {Promise<Object>} Full evaluation with all predictions
   */
  async evaluateReport(reportData) {
    try {
      const {
        description = '',
        disasterType,
        latitude,
        longitude,
        textLength,
        hasPrankKeywords = 0,
        nearbyReportsCount = 1,
      } = reportData;

      // Check cache first
      const cacheKey = this._getCacheKey(description, latitude, longitude, disasterType, nearbyReportsCount);
      if (this.predictionCache.has(cacheKey)) {
        return this.predictionCache.get(cacheKey);
      }

      const response = await this.client.post('evaluate-report', {
        description,
        disaster_type: disasterType,
        latitude,
        longitude,
        text_length: textLength != null ? textLength : description.length,
        has_prank_keywords: hasPrankKeywords,
        nearby_reports_count: nearbyReportsCount,
      });

      const result = {
        success: true,
        classification: response.data.classification,
        severity: response.data.severity,
        verification: response.data.verification,
        overall: response.data.overall,
      };

      // Cache the result
      this.predictionCache.set(cacheKey, result);

      return result;
    } catch (error) {
      // ML service unavailable - return default
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch process multiple reports
   * @param {Array} reports - Array of report objects
   * @returns {Promise<Array>} Evaluation results for each report
   */
  async batchEvaluateReports(reports) {
    const results = await Promise.all(
      reports.map(report => this.evaluateReport(report))
    );
    return results;
  }

  /**
   * FAST MODE: Synchronous < 15ms v2 inference for real-time triage
   * @param {Object} reportData - Report data
   * @returns {Promise<Object>} Fast evaluation result
   */
  async evaluateReportFast(reportData) {
    try {
      const { description = '', latitude, longitude, textLength, disasterType, nearbyReportsCount = 1 } = reportData;

      // Check cache first (keyed by description, coords, disasterType, and cluster count)
      const cacheKey = this._getCacheKey(description, latitude, longitude, disasterType, nearbyReportsCount);
      if (this.predictionCache.has(cacheKey)) {
        return this.predictionCache.get(cacheKey);
      }

      const response = await this.client.post('evaluate-report-fast', {
        reportText: description,
        description,
        latitude,
        longitude,
        text_length: textLength != null ? textLength : description.length,
        disasterType: disasterType || '',
        disaster_type: disasterType || '',
        nearby_reports_count: nearbyReportsCount || 1,
      });

      const result = {
        success: true,
        classification: response.data.classification,
        severity: response.data.severity,
        verification: response.data.verification,
        overall: response.data.overall,
      };

      // Cache the result
      this.predictionCache.set(cacheKey, result);

      return result;
    } catch (error) {
      // ML service unavailable - fall back to standard evaluation
      return this.evaluateReport(reportData);
    }
  }
}

// Export singleton instance
module.exports = new MLServiceClient();
