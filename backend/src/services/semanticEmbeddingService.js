'use strict';
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache embeddings for 24 hours to avoid repeated requests
const embeddingCache = new NodeCache({ stdTTL: 86400 });

/**
 * Semantic Embedding Service
 * Generates embeddings using HuggingFace API (free tier)
 * Falls back gracefully if API unavailable
 */
class SemanticEmbeddingService {
  constructor() {
    this.HF_API_KEY = process.env.HF_API_KEY;
    this.HF_MODEL = 'sentence-transformers/all-mpnet-base-v2';
    this.HF_API_URL = `https://api-inference.huggingface.co/models/${this.HF_MODEL}`;
    this.EMBEDDING_DIM = 768; // all-mpnet-base-v2 output dimension
    this.embeddings = {}; // In-memory fallback embeddings
  }

  /**
   * Generate embedding for text
   * @param {string} text - Input text
   * @returns {Promise<Array>} Embedding vector or null if failed
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length < 3) {
      return this._getFallbackEmbedding();
    }

    const cacheKey = `emb_${text.substring(0, 100)}`;
    const cached = embeddingCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Try HuggingFace API first (free tier)
      if (this.HF_API_KEY) {
        const embedding = await this._queryHuggingFace(text);
        if (embedding && embedding.length === this.EMBEDDING_DIM) {
          embeddingCache.set(cacheKey, embedding);
          return embedding;
        }
      }
    } catch (err) {
      console.warn('[SemanticEmbedding] HF API failed:', err.message);
    }

    // Fallback: simple hash-based embedding
    return this._simpleEmbedding(text);
  }

  /**
   * Query HuggingFace API for embeddings
   */
  async _queryHuggingFace(text) {
    try {
      const response = await axios.post(
        this.HF_API_URL,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${this.HF_API_KEY}`
          },
          timeout: 10000
        }
      );

      if (Array.isArray(response.data) && response.data.length > 0) {
        // HuggingFace returns array of arrays, flatten to single embedding
        return Array.isArray(response.data[0]) ? response.data[0] : response.data;
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Generate simple embedding from text (deterministic fallback)
   * Uses word frequency and character hash
   */
  _simpleEmbedding(text) {
    const vec = new Array(this.EMBEDDING_DIM).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(j);
        hash |= 0; // Convert to 32bit integer
      }
      const idx = Math.abs(hash) % this.EMBEDDING_DIM;
      vec[idx] += (i + 1) / words.length;
    }

    // Normalize
    const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
    return norm > 0 ? vec.map(x => x / norm) : vec;
  }

  /**
   * Get fallback embedding (zero vector)
   */
  _getFallbackEmbedding() {
    return new Array(this.EMBEDDING_DIM).fill(0);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(vec1, vec2) {
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
   * Find most similar category embedding
   */
  findMostSimilarCategory(textEmbedding, categoryEmbeddings) {
    let maxSimilarity = -1;
    let bestCategory = null;

    for (const [category, embedding] of Object.entries(categoryEmbeddings)) {
      const similarity = this.cosineSimilarity(textEmbedding, embedding);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestCategory = category;
      }
    }

    return { category: bestCategory, similarity: maxSimilarity };
  }
}

module.exports = new SemanticEmbeddingService();
