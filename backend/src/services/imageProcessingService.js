'use strict';
const geminiValidation = require('./geminiValidationService');

/**
 * Image Processing Service
 * Analyzes complaint images for category validation
 * Uses local analysis + Gemini vision for robust classification
 */
class ImageProcessingService {
  constructor() {
    this.localPatterns = this._initializeLocalPatterns();
    this.processedImages = [];
  }

  /**
   * Process complaint image
   * @param {Buffer} imageBuffer - Image file buffer
   * @param {string} category - Complaint category to validate against
   * @param {string} complaintText - Complaint description
   * @returns {Promise<Object>} Processing result
   */
  async processImage(imageBuffer, category, complaintText) {
    if (!imageBuffer) {
      return {
        processed: false,
        reason: 'No image provided',
        match: 'uncertain',
        requiresReview: false
      };
    }

    try {
      // Step 1: Local analysis
      const localResult = await this._analyzeLocally(imageBuffer, category);
      console.log('[ImageProcessing] Local analysis complete:', {
        confidence: localResult.categoryMatch,
        features: localResult.detectedFeatures
      });

      // Step 2: Unified validation via Gemini (complaint text + image together)
      let unifiedResult = null;
      if (imageBuffer && category && complaintText) {
        const imageBase64 = imageBuffer.toString('base64');
        unifiedResult = await geminiValidation.validateComplaintWithImage(
          complaintText,
          category,
          imageBase64,
          localResult
        );
        console.log('[ImageProcessing] Unified validation complete:', {
          textImageMatch: unifiedResult.consolidated?.textImageMatch,
          coherence: unifiedResult.consolidated?.complaintImageAlignment,
          status: unifiedResult.consolidated?.status
        });
      }

      // Return consolidated result
      return unifiedResult || this._getLocalOnlyResult(category, localResult);
    } catch (err) {
      console.error('[ImageProcessing] Error:', err.message);
      return {
        processed: false,
        error: err.message,
        match: 'uncertain',
        requiresReview: true,
        confidence: 0
      };
    }
  }

  /**
   * Fallback to local analysis result
   */
  _getLocalOnlyResult(category, localResult) {
    return {
      timestamp: new Date().toISOString(),
      source: 'local_only',
      
      local: {
        confidence: localResult.categoryMatch,
        features: localResult.detectedFeatures || [],
        labels: localResult.labels || []
      },

      gemini: null,

      consolidated: {
        textImageMatch: localResult.categoryMatch > 0.7 ? 'match' : 
                       (localResult.categoryMatch > 0.4 ? 'uncertain' : 'mismatch'),
        overallConfidence: localResult.categoryMatch,
        categoryValid: true,
        requiresReview: localResult.categoryMatch < 0.7,
        complaintImageAlignment: localResult.categoryMatch,
        status: localResult.categoryMatch > 0.7 ? 'VERIFIED' : 'UNCERTAIN',
        reasoning: 'Using local analysis only (Gemini unavailable)'
      }
    };
  }

  /**
   * Local image analysis using basic features
   * Detects common civic complaint patterns
   */
  async _analyzeLocally(imageBuffer, category) {
    const analysis = {
      timestamp: new Date().toISOString(),
      method: 'local',
      labels: [],
      detectedFeatures: [],
      categoryMatch: 0.5
    };

    try {
      // Check image size and format
      const imageSize = imageBuffer.length;
      if (imageSize < 1000) {
        analysis.detectedFeatures.push('small_image');
        analysis.categoryMatch = 0.3;
        return analysis;
      }

      if (imageSize > 10 * 1024 * 1024) {
        analysis.detectedFeatures.push('large_image');
        analysis.categoryMatch = 0.4;
        return analysis;
      }

      // Use basic file signature detection to understand image type
      const signature = this._getImageSignature(imageBuffer);
      analysis.imageType = signature.type;
      analysis.detectedFeatures.push(`format_${signature.type}`);

      // Local pattern matching based on file characteristics
      const matchScore = this._matchLocalPatterns(category, signature, imageBuffer);
      analysis.categoryMatch = matchScore;

      // Add likely content labels
      analysis.labels = this._generateLocalLabels(imageBuffer, category);

      return analysis;
    } catch (err) {
      console.warn('[LocalImageAnalysis] Error:', err.message);
      analysis.error = err.message;
      return analysis;
    }
  }

  /**
   * Get image file signature (header bytes)
   */
  _getImageSignature(buffer) {
    const signature = {
      type: 'unknown',
      size: buffer.length
    };

    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      signature.type = 'jpeg';
    }
    // PNG
    else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      signature.type = 'png';
    }
    // GIF
    else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      signature.type = 'gif';
    }
    // WebP
    else if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      signature.type = 'webp';
    }

    return signature;
  }

  /**
   * Match image against local patterns for the category
   */
  _matchLocalPatterns(category, signature, buffer) {
    const patterns = this.localPatterns[category] || this.localPatterns.other;
    let score = 0.5; // Baseline

    // File size heuristics
    const size = buffer.length;
    if (size > 100 * 1024) score += 0.1; // Likely detailed photo
    if (size > 3 * 1024 * 1024) score = Math.max(score - 0.2, 0); // Too large might be video

    // Format matching
    if (patterns.formats && patterns.formats.includes(signature.type)) {
      score += 0.2;
    }

    // Color space analysis (very basic)
    if (patterns.colorHints) {
      const estimated = this._estimateColorSpace(buffer);
      if (estimated && patterns.colorHints.includes(estimated)) {
        score += 0.15;
      }
    }

    return Math.min(score, 0.95);
  }

  /**
   * Estimate color space from image data
   */
  _estimateColorSpace(buffer) {
    // Very basic heuristic - just sample some bytes
    let red = 0, green = 0, blue = 0, count = 0;

    for (let i = 0; i < Math.min(buffer.length, 10000); i += 3) {
      red += buffer[i] || 0;
      green += buffer[i + 1] || 0;
      blue += buffer[i + 2] || 0;
      count++;
    }

    if (count === 0) return null;

    red /= count;
    green /= count;
    blue /= count;

    // Categorize dominant color
    const dominant = Math.max(red, green, blue);
    if (red > dominant * 0.8 && Math.abs(red - green) > 20) return 'red';
    if (green > dominant * 0.8) return 'green';
    if (blue > dominant * 0.8) return 'blue';
    if (Math.abs(red - green - blue) < 10) return 'grayscale';

    return 'mixed';
  }

  /**
   * Generate content labels based on category patterns
   */
  _generateLocalLabels(buffer, category) {
    const labels = [];
    const patterns = this.localPatterns[category] || this.localPatterns.other;

    // Heuristic: image size and format suggest photo or official report
    if (buffer.length > 500 * 1024) {
      labels.push('high_quality_photo');
    }

    if (patterns.likelyLabels) {
      labels.push(...patterns.likelyLabels.slice(0, 3)); // Top 3
    }

    return labels;
  }

  /**
   * Combine local and Gemini results
   */
  _combineResults(category, localResult, geminiResult) {
    const combined = {
      timestamp: new Date().toISOString(),
      category: category,
      localAnalysis: localResult,
      geminiAnalysis: geminiResult,
      match: 'uncertain',
      confidence: 0,
      requiresReview: false
    };

    // Determine match status
    if (geminiResult && geminiResult.source === 'gemini-2.5-flash-lite') {
      combined.match = geminiResult.match;
      combined.confidence = geminiResult.confidence;
      
      if (geminiResult.match === 'mismatch') {
        combined.requiresReview = true;
      }
    } else {
      // Fallback to local analysis
      combined.confidence = localResult.categoryMatch;
      
      if (localResult.categoryMatch > 0.7) {
        combined.match = 'match';
      } else if (localResult.categoryMatch > 0.4) {
        combined.match = 'uncertain';
        combined.requiresReview = true;
      } else {
        combined.match = 'mismatch';
        combined.requiresReview = true;
      }
    }

    // Add detected labels
    combined.detectedLabels = [
      ...localResult.labels,
      ...(geminiResult?.objects_detected || [])
    ];

    return combined;
  }

  /**
   * Initialize local patterns for each category
   */
  _initializeLocalPatterns() {
    return {
      roads: {
        formats: ['jpeg', 'png', 'webp'],
        colorHints: ['grayscale', 'brown', 'gray'],
        likelyLabels: ['pothole', 'pavement', 'asphalt', 'road']
      },
      water_supply: {
        formats: ['jpeg', 'png'],
        colorHints: ['blue', 'mixed'],
        likelyLabels: ['water', 'pipe', 'leak', 'bathroom']
      },
      electricity: {
        formats: ['jpeg', 'png'],
        colorHints: ['red', 'mixed'],
        likelyLabels: ['wire', 'pole', 'transformer', 'sparks']
      },
      waste_management: {
        formats: ['jpeg', 'png'],
        colorHints: ['brown', 'gray', 'mixed'],
        likelyLabels: ['garbage', 'trash', 'waste', 'dump']
      },
      drainage: {
        formats: ['jpeg', 'png'],
        colorHints: ['blue', 'gray', 'brown'],
        likelyLabels: ['drain', 'water', 'overflow', 'flood']
      },
      street_lights: {
        formats: ['jpeg', 'png'],
        colorHints: ['mixed', 'grayscale'],
        likelyLabels: ['street', 'light', 'pole', 'dark']
      },
      other: {
        formats: ['jpeg', 'png', 'gif', 'webp'],
        colorHints: ['mixed'],
        likelyLabels: ['civic', 'complaint', 'issue']
      }
    };
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      totalProcessed: this.processedImages.length,
      avgConfidence: this.processedImages.length > 0
        ? (this.processedImages.reduce((sum, img) => sum + (img.confidence || 0), 0) / this.processedImages.length).toFixed(3)
        : 0,
      matchDistribution: this._getMatchDistribution()
    };
  }

  /**
   * Get distribution of match results
   */
  _getMatchDistribution() {
    const dist = { match: 0, mismatch: 0, uncertain: 0 };
    for (const img of this.processedImages) {
      dist[img.match] = (dist[img.match] || 0) + 1;
    }
    return dist;
  }

  /**
   * Map category to department and priority for logging
   */
  getCategoryInfo(category) {
    const categoryMap = {
      roads: { dept: 'PWD', priority: 'high', score: 0.85 },
      water_supply: { dept: 'DJB', priority: 'high', score: 0.82 },
      electricity: { dept: 'BSES', priority: 'critical', score: 0.90 },
      waste_management: { dept: 'MCD', priority: 'medium', score: 0.75 },
      drainage: { dept: 'DJB', priority: 'high', score: 0.88 },
      infrastructure: { dept: 'PWD', priority: 'high', score: 0.80 },
      parks: { dept: 'PRD', priority: 'low', score: 0.70 },
      health: { dept: 'HFW', priority: 'critical', score: 0.87 },
      education: { dept: 'EDU', priority: 'medium', score: 0.73 },
      public_services: { dept: 'MCD', priority: 'medium', score: 0.65 },
      law_enforcement: { dept: 'DPOL', priority: 'critical', score: 0.89 },
      street_lights: { dept: 'NDMC', priority: 'high', score: 0.83 },
      noise_pollution: { dept: 'DPOL', priority: 'medium', score: 0.72 },
      other: { dept: 'MCD', priority: 'low', score: 0.50 }
    };
    return categoryMap[category] || categoryMap.other;
  }
}

module.exports = new ImageProcessingService();
