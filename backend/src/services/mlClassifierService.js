'use strict';

/**
 * ML Classifier Service
 * Lightweight classifier using embeddings
 * Uses Naive Bayes and simple distance-based classification
 */
class MLClassifierService {
  constructor() {
    this.categoryPrototypes = {}; // Category embedding prototypes
    this.trainingData = [];
    this.isInitialized = false;
  }

  /**
   * Initialize classifier with training data
   * @param {Object} categoryEmbeddings - Pre-computed category embeddings
   */
  initializeWithEmbeddings(categoryEmbeddings) {
    this.categoryPrototypes = categoryEmbeddings;
    this.isInitialized = true;
  }

  /**
   * Classify text embedding using k-NN style approach
   * @param {Array} embedding - Text embedding vector
   * @param {Object} categoryEmbeddings - Category prototype embeddings
   * @returns {Object} Classification result
   */
  classify(embedding, categoryEmbeddings) {
    if (!embedding || !categoryEmbeddings) {
      return {
        labels: [],
        confidence: 0,
        scores: {}
      };
    }

    const scores = {};
    const similarities = {};

    // Calculate similarity to each category
    for (const [category, categoryVec] of Object.entries(categoryEmbeddings)) {
      const similarity = this._cosineSimilarity(embedding, categoryVec);
      similarities[category] = similarity;
      scores[category] = similarity;
    }

    // Sort by similarity
    const sorted = Object.entries(similarities)
      .sort((a, b) => b[1] - a[1]);

    const topCategory = sorted[0];
    const secondCategory = sorted[1];

    if (!topCategory || topCategory[1] < 0.3) {
      return {
        labels: ['other'],
        confidence: 0,
        scores,
        reason: 'Low confidence across all categories'
      };
    }

    // Single label if confidence high
    const confidence = topCategory[1];
    const labels = [topCategory[0]];

    // Multi-label if second label also strong
    if (secondCategory && secondCategory[1] > 0.6 && (topCategory[1] - secondCategory[1]) < 0.2) {
      labels.push(secondCategory[0]);
    }

    return {
      labels,
      confidence,
      scores,
      primary: topCategory[0],
      secondary: secondCategory ? secondCategory[0] : null
    };
  }

  /**
   * Bayesian classification using keyword probabilities
   * @param {Array} keywords - Extracted keywords
   * @param {Object} categoryKeywordProbs - Pre-computed keyword probabilities per category
   */
  bayesianClassify(keywords, categoryKeywordProbs) {
    const scores = {};

    for (const [category, probs] of Object.entries(categoryKeywordProbs || {})) {
      let score = 1.0; // Prior probability
      
      for (const keyword of keywords) {
        const prob = probs[keyword] || 0.1; // Laplace smoothing
        score *= prob;
      }
      
      scores[category] = score;
    }

    // Normalize
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    for (const cat in scores) {
      scores[cat] = total > 0 ? scores[cat] / total : 0;
    }

    return scores;
  }

  /**
   * Ensemble classification combining multiple approaches
   */
  ensembleClassify(embedding, keywords, categoryEmbeddings, categoryKeywordProbs) {
    const embeddingResult = this.classify(embedding, categoryEmbeddings);
    const bayesianScores = this.bayesianClassify(keywords, categoryKeywordProbs);

    // Combine scores (weighted average)
    const weights = { embedding: 0.6, bayesian: 0.4 };
    const combined = {};

    for (const category of Object.keys(categoryEmbeddings || {})) {
      const embScore = embeddingResult.scores?.[category] || 0;
      const bayScore = bayesianScores?.[category] || 0;
      combined[category] = (embScore * weights.embedding) + (bayScore * weights.bayesian);
    }

    const sorted = Object.entries(combined).sort((a, b) => b[1] - a[1]);
    const topCategory = sorted[0];

    return {
      labels: topCategory ? [topCategory[0]] : ['other'],
      confidence: topCategory ? topCategory[1] : 0,
      scores: combined,
      method: 'ensemble'
    };
  }

  /**
   * Anomaly detection for unusual classifications
   */
  detectAnomalies(embedding, categoryEmbeddings) {
    const similarities = [];
    for (const [category, vec] of Object.entries(categoryEmbeddings)) {
      similarities.push(this._cosineSimilarity(embedding, vec));
    }

    const avg = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const variance = similarities.reduce((a, val) => a + (val - avg) ** 2, 0) / similarities.length;
    const stdDev = Math.sqrt(variance);

    // If max similarity is far from others, might be anomaly
    const maxSim = Math.max(...similarities);
    const isAnomaly = (maxSim - avg) > (2 * stdDev);

    return { isAnomaly, maxSimilarity: maxSim, avgSimilarity: avg, stdDev };
  }

  /**
   * Cosine similarity
   */
  _cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  /**
   * Update classifier with new training example
   */
  addTrainingExample(text, embedding, category) {
    this.trainingData.push({ text, embedding, category });
  }

  /**
   * Get training statistics
   */
  getStats() {
    return {
      trainingExamples: this.trainingData.length,
      categoriesInitialized: Object.keys(this.categoryPrototypes).length,
      isInitialized: this.isInitialized
    };
  }
}

module.exports = new MLClassifierService();
