/**
 * ML Service Client
 * Integrates with SALBA ML Service (Flask backend)
 * Provides disaster classification, severity prediction, and false alarm detection
 */

const axios = require('axios');
const crypto = require('crypto');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001/api/ml';

class MLServiceClient {
  constructor() {
    this.baseURL = ML_SERVICE_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 3000, // Reduced timeout for faster failure
    });
    
    // Simple in-memory cache for predictions (auto-clear every 5 minutes)
    this.predictionCache = new Map();
    setInterval(() => {
      this.predictionCache.clear();
    }, 5 * 60 * 1000);
  }

  /**
   * Generate cache key from report data
   */
  _getCacheKey(description, latitude, longitude) {
    const data = `${description}|${latitude}|${longitude}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Check if ML service is available
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        status: response.data.status,
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
   * @returns {Promise<Object>} Classification result with disaster type and confidence
   */
  async classifyDisaster(description, latitude, longitude) {
    try {
      const response = await this.client.post('/classify', {
        description,
        latitude,
        longitude,
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
   * @returns {Promise<Object>} Severity prediction with level and confidence
   */
  async predictSeverity(description, textLength = null) {
    try {
      const response = await this.client.post('/severity', {
        description,
        text_length: textLength || description.length,
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
   * @returns {Promise<Object>} Verification result
   */
  async verifyReport(description, hasPrankKeywords = 0) {
    try {
      const response = await this.client.post('/verify', {
        description,
        has_prank_keywords: hasPrankKeywords,
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
        description,
        disasterType,
        latitude,
        longitude,
        textLength,
        hasPrankKeywords = 0,
      } = reportData;

      // Check cache first
      const cacheKey = this._getCacheKey(description, latitude, longitude);
      if (this.predictionCache.has(cacheKey)) {
        return this.predictionCache.get(cacheKey);
      }

      const response = await this.client.post('/evaluate-report', {
        description,
        disaster_type: disasterType,
        latitude,
        longitude,
        text_length: textLength || description.length,
        has_prank_keywords: hasPrankKeywords,
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
   * FAST MODE: Quick predictions for real-time updates (100-300ms)
   * Uses parallel ML inference. Good for dashboard auto-refresh.
   * @param {Object} reportData - Report data
   * @returns {Promise<Object>} Fast evaluation result
   */
  async evaluateReportFast(reportData) {
    try {
      const { description, latitude, longitude, textLength } = reportData;

      // Check cache first
      const cacheKey = this._getCacheKey(description, latitude, longitude);
      if (this.predictionCache.has(cacheKey)) {
        return this.predictionCache.get(cacheKey);
      }

      const response = await this.client.post('/evaluate-report-fast', {
        reportText: description,
        description,
        latitude,
        longitude,
        text_length: textLength || description.length,
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
