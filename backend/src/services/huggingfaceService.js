'use strict';
const { HfInference } = require('@huggingface/inference');

/**
 * HuggingFace Service
 * Provides text classification and semantic analysis using HuggingFace models
 */
class HuggingFaceService {
  constructor() {
    const apiKey = process.env.HF_API_KEY;
    this.client = apiKey ? new HfInference(apiKey) : null;
    this.isAvailable = !!this.client;
    this.stats = { attempts: 0, successes: 0, failures: 0 };
    
    if (this.isAvailable) {
      console.log('[HuggingFaceService] Initialized with official SDK');
    } else {
      console.warn('[HuggingFaceService] No API key - HuggingFace features disabled');
    }
  }

  /**
   * Classify complaint text using HuggingFace zero-shot classification
   * @param {string} text - Complaint text to classify
   * @param {Array} categories - Available categories to classify into
   * @returns {Promise<Object>} Classification result with scores
   */
  async classifyComplaint(text, categories) {
    this.stats.attempts++;

    if (!this.isAvailable || !text || !categories || categories.length === 0) {
      console.log('[HuggingFaceClassify] Skipped (missing params or API unavailable)');
      return this._getFallback(categories);
    }

    try {
      console.log('[HuggingFaceClassify] Classifying with:', categories.length, 'categories');
      
      // Use zero-shot classification - works for any categories
      const result = await this.client.zeroShotClassification({
        model: 'facebook/bart-large-mnli',
        inputs: text.substring(0, 512), // Limit text length
        candidate_labels: categories,
        multi_class: false
      });

      this.stats.successes++;

      // Extract top result
      const topLabel = result.labels[0];
      const topScore = result.scores[0];
      const allScores = {};
      
      result.labels.forEach((label, idx) => {
        allScores[label] = result.scores[idx];
      });

      console.log('[HuggingFaceClassify] Result:', topLabel, 'confidence:', (topScore * 100).toFixed(1) + '%');

      return {
        category: topLabel,
        confidence: topScore,
        allScores: allScores,
        source: 'huggingface',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.warn('[HuggingFaceClassify] Failed:', err.message);
      this.stats.failures++;
      return this._getFallback(categories);
    }
  }

  /**
   * Detect sentiment of complaint text
   * @param {string} text - Complaint text
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyzeSentiment(text) {
    this.stats.attempts++;

    if (!this.isAvailable || !text) {
      console.log('[HuggingFaceSentiment] Skipped (missing text or API unavailable)');
      return { sentiment: 'neutral', confidence: 0.5, source: 'fallback' };
    }

    try {
      console.log('[HuggingFaceSentiment] Analyzing sentiment');
      
      const result = await this.client.textClassification({
        model: 'distilbert-base-uncased-finetuned-sst-2-english',
        inputs: text.substring(0, 512)
      });

      const topResult = result[0];
      
      // Map to our sentiment scale
      let sentiment = 'neutral';
      if (topResult.label === 'POSITIVE') sentiment = 'positive';
      else if (topResult.label === 'NEGATIVE') sentiment = 'negative';
      
      this.stats.successes++;

      console.log('[HuggingFaceSentiment] Result:', sentiment, 'confidence:', (topResult.score * 100).toFixed(1) + '%');

      return {
        sentiment: sentiment,
        confidence: topResult.score,
        raw_label: topResult.label,
        source: 'huggingface',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.warn('[HuggingFaceSentiment] Failed:', err.message);
      this.stats.failures++;
      return { sentiment: 'neutral', confidence: 0.5, source: 'fallback' };
    }
  }

  /**
   * Extract key entities/topics from text
   * @param {string} text - Complaint text
   * @returns {Promise<Array>} List of extracted entities
   */
  async extractEntities(text) {
    this.stats.attempts++;

    if (!this.isAvailable || !text) {
      console.log('[HuggingFaceExtract] Skipped (missing text or API unavailable)');
      return [];
    }

    try {
      console.log('[HuggingFaceExtract] Extracting entities');
      
      // Use token classification for named entity recognition
      const result = await this.client.tokenClassification({
        model: 'dbmdz/bert-base-cased-finetuned-conll03-english',
        inputs: text.substring(0, 512)
      });

      const entities = result
        .filter(token => token.entity_group && token.entity_group !== 'O')
        .map(token => ({
          text: token.word,
          type: token.entity_group,
          score: token.score
        }));

      this.stats.successes++;

      console.log('[HuggingFaceExtract] Found', entities.length, 'entities');

      return entities;
    } catch (err) {
      console.warn('[HuggingFaceExtract] Failed:', err.message);
      this.stats.failures++;
      return [];
    }
  }

  /**
   * Summarize complex complaint text
   * @param {string} text - Complaint text to summarize
   * @param {number} maxLength - Maximum summary length
   * @returns {Promise<string>} Summarized text
   */
  async summarizeText(text, maxLength = 100) {
    this.stats.attempts++;

    if (!this.isAvailable || !text) {
      console.log('[HuggingFaceSummarize] Skipped (missing text or API unavailable)');
      return text;
    }

    try {
      console.log('[HuggingFaceSummarize] Summarizing text');
      
      const result = await this.client.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: text.substring(0, 1024),
        parameters: {
          max_length: Math.min(maxLength, 150),
          min_length: 50
        }
      });

      this.stats.successes++;

      const summary = result[0].summary_text;
      console.log('[HuggingFaceSummarize] Summary length:', summary.length);

      return summary;
    } catch (err) {
      console.warn('[HuggingFaceSummarize] Failed:', err.message);
      this.stats.failures++;
      return text.substring(0, maxLength) + '...';
    }
  }

  /**
   * Get fallback classification
   */
  _getFallback(categories) {
    if (!categories || categories.length === 0) {
      return {
        category: 'other',
        confidence: 0.5,
        allScores: {},
        source: 'fallback',
        timestamp: new Date().toISOString()
      };
    }

    const scores = {};
    categories.forEach(cat => {
      scores[cat] = 0.5 / categories.length;
    });

    return {
      category: categories[0],
      confidence: 0.5,
      allScores: scores,
      source: 'fallback',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.attempts > 0 
        ? ((this.stats.successes / this.stats.attempts) * 100).toFixed(1) + '%'
        : 'N/A',
      isAvailable: this.isAvailable
    };
  }
}

module.exports = new HuggingFaceService();
