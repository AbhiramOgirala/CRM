'use strict';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');

// Cache Gemini validation results for 12 hours
const geminiCache = new NodeCache({ stdTTL: 43200 });

/**
 * Gemini Validation Service (using official SDK)
 * Uses Google's Gemini API to validate and refine classifications
 * Gracefully falls back if API is unavailable
 */
class GeminiValidationService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.model = 'gemini-3.1-flash-lite-preview';
    this.isAvailable = !!this.client;
    this.validationStats = { attempts: 0, successes: 0, failures: 0 };
    
    if (this.isAvailable) {
      console.log('[GeminiService] Initialized with official SDK');
    } else {
      console.warn('[GeminiService] No API key - Gemini validation disabled');
    }
  }

  /**
   * Validate complaint classification and priority
   * @param {string} complaintText - Full complaint text
   * @param {string} predictedCategory - Predicted category
   * @param {string} priority - Predicted priority
   * @param {Array} keywords - Keywords extracted
   * @returns {Promise<Object>} Gemini validation result
   */
  async validateClassification(complaintText, predictedCategory, priority, keywords) {
    this.validationStats.attempts++;

    if (!this.isAvailable) {
      return this._getDefaultValidation(predictedCategory, priority);
    }

    const cacheKey = `gem_${complaintText.substring(0, 50).replace(/\s+/g, '_')}`;
    const cached = geminiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const prompt = this._buildValidationPrompt(complaintText, predictedCategory, priority, keywords);
      const response = await this._callGeminiAPI(prompt);
      
      if (response) {
        this.validationStats.successes++;
        geminiCache.set(cacheKey, response);
        return response;
      }
    } catch (err) {
      console.warn('[GeminiValidation] API call failed:', err.message);
      this.validationStats.failures++;
    }

    return this._getDefaultValidation(predictedCategory, priority);
  }

  /**
   * Validate image against complaint category
   * @param {string} imageBase64 - Image in base64
   * @param {string} complaintCategory - Category to validate against
   * @param {string} complaintText - Complaint description
   * @returns {Promise<Object>} Image validation result
   */
  async validateImageMatch(imageBase64, complaintCategory, complaintText) {
    if (!this.isAvailable || !imageBase64) {
      console.log('[GeminiImageValidation] Skipped (API unavailable or no image)');
      return {
        match: 'uncertain',
        confidence: 0,
        reason: 'Image validation unavailable - using local analysis',
        requires_review: false,
        source: 'fallback'
      };
    }

    try {
      const prompt = `You are an expert in analyzing civic complaint images.

Given the complaint category: "${complaintCategory}"
And complaint text: "${complaintText}"

Does the provided image match this complaint? Respond with JSON:
{
  "match": "match" | "mismatch" | "uncertain",
  "confidence": 0-1,
  "objects_detected": ["list", "of", "objects"],
  "explanation": "brief explanation"
}`;

      console.log('[GeminiImageValidation] Attempting image validation...');
      const response = await this._callGeminiAPIWithImage(prompt, imageBase64);
      console.log('[GeminiImageValidation] Success', response);
      return response;
    } catch (err) {
      console.warn('[GeminiImageValidation] Failed - using local analysis only');
      console.warn('  Reason:', err.message);
      return {
        match: 'uncertain',
        confidence: 0,
        reason: `Image validation unavailable: ${err.message}`,
        requires_review: false,
        source: 'fallback'
      };
    }
  }

  /**
   * Build validation prompt for Gemini
   */
  _buildValidationPrompt(text, category, priority, keywords) {
    const categoryDescriptions = {
      roads: '(potholes, broken roads, bridges, infrastructure damage)',
      water_supply: '(no water, leaks, contaminated water, pipeline issues)',
      electricity: '(power cuts, transformer issues, street lights, live wires)',
      waste_management: '(garbage, waste, dumps, dirty areas)',
      drainage: '(blocked drains, flooding, waterlogging, sewage)',
      infrastructure: '(building collapse, cracks, unsafe structures)',
      parks: '(park maintenance, broken playground, trees)',
      health: '(hospital issues, disease outbreaks, health concerns)',
      education: '(school issues, teachers, facilities)',
      public_services: '(ration, pensions, government services)',
      law_enforcement: '(crime, traffic, accidents, harassment)',
      street_lights: '(street light issues, dark roads)',
      noise_pollution: '(noise, loud speakers, disturbances)',
      other: '(miscellaneous civic issues)'
    };

    return `You are an expert civic complaint classifier.

COMPLAINT TEXT:
"${text}"

PREDICTED CATEGORY: ${category} ${categoryDescriptions[category] || ''}
PREDICTED PRIORITY: ${priority}
EXTRACTED KEYWORDS: ${keywords.join(', ')}

Analyze the complaint and provide validation in JSON format:
{
  "category_correct": true/false,
  "category_confidence": 0.0-1.0,
  "suggested_category": "alternative category if needed",
  "priority_correct": true/false,
  "priority_confidence": 0.0-1.0,
  "suggested_priority": "critical|high|medium|low if needed",
  "should_override": true/false,
  "reasoning": "brief explanation",
  "additional_notes": "any important observations"
}

Respond ONLY with valid JSON.`;
  }

  /**
   * Call Gemini API using official SDK
   */
  async _callGeminiAPI(prompt) {
    try {
      console.log('[GeminiAPI] Calling model:', this.model);
      const model = this.client.getGenerativeModel({ model: this.model });
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();
      
      console.log('[GeminiAPI] Success - received response');
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          source: 'gemini',
          timestamp: new Date().toISOString(),
          adjusted: parsed.should_override || !parsed.category_correct
        };
      }
      
      throw new Error('No JSON found in response');
    } catch (err) {
      console.error('[GeminiAPI] Error:', err.message);
      throw err;
    }
  }

  /**
   * Parse data URL and extract mime type + base64
   * Handles both "data:image/jpeg;base64,..." and pure base64 formats
   */
  _parseImageData(imageData) {
    if (!imageData) return { base64: null, mimeType: 'image/jpeg' };

    // Check if it's a data URL
    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        return {
          base64: matches[2],
          mimeType: matches[1]
        };
      }
    }

    // Otherwise assume it's pure base64
    return {
      base64: imageData,
      mimeType: 'image/jpeg'
    };
  }

  /**
   * Call Gemini API with image using official SDK
   */
  async _callGeminiAPIWithImage(prompt, imageBase64) {
    try {
      console.log('[GeminiImageAPI] Calling model with image:', this.model);
      console.log('[GeminiImageAPI] Image size: ~' + imageBase64.length + ' chars');

      // Parse image data (handle both data URL and pure base64)
      const { base64, mimeType } = this._parseImageData(imageBase64);
      
      if (!base64) {
        throw new Error('No valid base64 image data found');
      }

      console.log('[GeminiImageAPI] Extracted mime type:', mimeType);
      console.log('[GeminiImageAPI] Base64 length:', base64.length, 'chars');

      const model = this.client.getGenerativeModel({ model: this.model });
      
      console.log('[GeminiImageAPI] Generating content...');
      
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API call timeout')), 30000)
      );
      
      const result = await Promise.race([
        model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64,
              mimeType: mimeType
            }
          }
        ]),
        timeoutPromise
      ]);
      
      console.log('[GeminiImageAPI] Got result object, extracting text...');
      
      const response = result?.response;
      if (!response) {
        throw new Error('No response from model');
      }
      
      const responseText = response.text();
      console.log('[GeminiImageAPI] Response text length:', responseText.length);
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[GeminiImageAPI] Success - parsed JSON');
        return {
          ...JSON.parse(jsonMatch[0]),
          source: 'gemini-vision',
          timestamp: new Date().toISOString()
        };
      }
      
      throw new Error('No JSON found in vision response');
    } catch (err) {
      console.error('[GeminiImageAPI] Error:', err.message, err.stack);
      throw err;
    }
  }

  /**
   * Get default validation (fallback)
   */
  _getDefaultValidation(category, priority) {
    return {
      category_correct: true,
      category_confidence: 0.5,
      priority_correct: true,
      priority_confidence: 0.5,
      should_override: false,
      reasoning: 'Gemini validation unavailable - using rule-based result',
      source: 'fallback',
      adjusted: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate complaint text + image together in single Gemini call
   * Checks if image matches complaint description and category
   * @param {string} complaintText - Full complaint text
   * @param {string} complaintCategory - Complaint category
   * @param {string} imageBase64 - Image in base64
   * @param {Object} localAnalysisResult - Local image analysis result
   * @returns {Promise<Object>} Unified validation result
   */
  async validateComplaintWithImage(complaintText, complaintCategory, imageBase64, localAnalysisResult) {
    this.validationStats.attempts++;

    if (!this.isAvailable || !imageBase64) {
      console.log('[GeminiUnifiedValidation] Skipped (API unavailable)');
      return this._getDefaultUnifiedValidation(complaintCategory, localAnalysisResult);
    }

    try {
      const localConfidence = localAnalysisResult?.categoryMatch || 0;
      const localFeatures = (localAnalysisResult?.detectedFeatures || []).join(', ');

      const prompt = `You are an expert civic complaint analyst. Your task is to validate if a complaint text and image are coherent and correctly categorized.

COMPLAINT DETAILS:
- Text: "${complaintText}"
- Category: ${complaintCategory}

LOCAL IMAGE ANALYSIS (for reference):
- Confidence: ${(localConfidence * 100).toFixed(1)}%
- Detected Features: ${localFeatures || 'none'}

Please analyze both the complaint text and provided image together, then respond confirming:
1. Does the image visually match what the complaint describes?
2. Is the category appropriate for both text AND image?
3. Overall validation of text-image coherence
4. Any contradictions or concerns?

Respond ONLY with valid JSON:
{
  "text_image_match": "match" | "mismatch" | "uncertain",
  "text_image_coherence": 0.0-1.0,
  "category_matches_text": true | false,
  "category_matches_image": true | false,
  "visual_description_match": "match" | "mismatch" | "uncertain",
  "objects_in_image": ["list", "of", "detected", "objects"],
  "complaint_description_issues": "none" | "description of any concerns",
  "final_validation": "valid" | "suspicious" | "ambiguous",
  "confidence_score": 0.0-1.0,
  "explanation": "brief summary of findings"
}`;

      console.log('[GeminiUnifiedValidation] Validating complaint + image together...');
      const response = await this._callGeminiAPIWithImage(prompt, imageBase64);
      
      this.validationStats.successes++;

      // Process unified result
      return this._processUnifiedValidation(response, complaintCategory, localAnalysisResult);
    } catch (err) {
      console.warn('[GeminiUnifiedValidation] Failed:', err.message);
      this.validationStats.failures++;
      return this._getDefaultUnifiedValidation(complaintCategory, localAnalysisResult);
    }
  }

  /**
   * Process unified validation and determine if complaint + image match
   */
  _processUnifiedValidation(geminiResult, category, localResult) {
    const result = {
      timestamp: new Date().toISOString(),
      source: 'unified',
      
      gemini: {
        textImageMatch: geminiResult.text_image_match || 'uncertain',
        textImageCoherence: geminiResult.text_image_coherence || 0,
        categoryMatchesText: geminiResult.category_matches_text ?? true,
        categoryMatchesImage: geminiResult.category_matches_image ?? true,
        visualDescriptionMatch: geminiResult.visual_description_match || 'uncertain',
        detectedObjects: geminiResult.objects_in_image || [],
        issues: geminiResult.complaint_description_issues || 'none',
        finalValidation: geminiResult.final_validation || 'ambiguous',
        confidence: geminiResult.confidence_score || 0,
        explanation: geminiResult.explanation || ''
      },

      local: {
        confidence: localResult?.categoryMatch || 0,
        features: localResult?.detectedFeatures || [],
        labels: localResult?.labels || []
      },

      // Final consolidated judgment
      consolidated: {
        textImageMatch: geminiResult.text_image_match || 'uncertain',
        overallConfidence: (geminiResult.confidence_score + (localResult?.categoryMatch || 0)) / 2,
        categoryValid: (geminiResult.category_matches_text && geminiResult.category_matches_image),
        requiresReview: geminiResult.final_validation === 'suspicious' || 
                       geminiResult.text_image_coherence < 0.6 ||
                       (geminiResult.text_image_match === 'mismatch'),
        complaintImageAlignment: geminiResult.text_image_coherence,
        status: this._determineUnifiedStatus(geminiResult, localResult),
        reasoning: `Text-Image Coherence: ${(geminiResult.text_image_coherence * 100).toFixed(1)}% | ` +
                  `Category Valid: ${geminiResult.category_matches_text && geminiResult.category_matches_image ? 'Yes' : 'No'} | ` +
                  `Validation: ${geminiResult.final_validation}`
      }
    };

    return result;
  }

  /**
   * Determine unified validation status
   */
  _determineUnifiedStatus(geminiResult, localResult) {
    if (geminiResult.final_validation === 'valid' && geminiResult.text_image_coherence > 0.8) {
      return 'VERIFIED';
    } else if (geminiResult.final_validation === 'suspicious' || geminiResult.text_image_match === 'mismatch') {
      return 'MISMATCH';
    } else {
      return 'UNCERTAIN';
    }
  }

  /**
   * Default unified validation (fallback)
   */
  _getDefaultUnifiedValidation(category, localResult) {
    return {
      timestamp: new Date().toISOString(),
      source: 'fallback',
      
      gemini: null,

      local: {
        confidence: localResult?.categoryMatch || 0,
        features: localResult?.detectedFeatures || [],
        labels: localResult?.labels || []
      },

      consolidated: {
        textImageMatch: 'uncertain',
        overallConfidence: localResult?.categoryMatch || 0,
        categoryValid: true,
        requiresReview: (localResult?.categoryMatch || 0) < 0.7,
        complaintImageAlignment: localResult?.categoryMatch || 0,
        status: (localResult?.categoryMatch || 0) > 0.7 ? 'VERIFIED' : 'UNCERTAIN',
        reasoning: 'Using local analysis only (Gemini unavailable)'
      }
    };
  }

  /**
   * Verify local image analysis with Gemini
   * Sends local analysis + image to Gemini for verification and consolidation
   * @param {Object} localResult - Local image analysis result
   * @param {string} imageBase64 - Image in base64
   * @param {string} complaintCategory - Complaint category
   * @param {string} complaintText - Complaint description
   * @returns {Promise<Object>} Consolidated verification result
   */
  async verifyImageAnalysisWithGemini(localResult, imageBase64, complaintCategory, complaintText) {
    this.validationStats.attempts++;

    if (!this.isAvailable || !imageBase64) {
      console.log('[GeminiImageVerification] Skipped (API unavailable)');
      return this._getDefaultImageVerification(localResult, 'fallback');
    }

    try {
      const prompt = `You are an expert civic infrastructure analyst reviewing a complaint image.

LOCAL ANALYSIS FINDINGS:
- Detected category match confidence: ${(localResult.categoryMatch * 100).toFixed(1)}%
- Detected features: ${localResult.detectedFeatures.join(', ') || 'none'}
- Detected labels: ${localResult.labels.join(', ') || 'none'}

COMPLAINT DETAILS:
- Category: ${complaintCategory}
- Description: "${complaintText}"

Please analyze the provided image and:
1. Verify if the local analysis findings are correct
2. Assess if the image matches the complaint category
3. Provide your own confidence level (0-1)
4. Identify any additional objects or issues not detected locally
5. Suggest the final category if different from local analysis

Respond ONLY with valid JSON:
{
  "local_analysis_valid": true/false,
  "local_confidence_assessment": "low|medium|high",
  "gemini_category_match": "match"|"mismatch"|"uncertain",
  "gemini_confidence": 0.0-1.0,
  "additional_detected_objects": ["list"],
  "alternative_category_suggestion": "category or null",
  "agreement_level": "full|partial|disagreement",
  "explanation": "brief explanation of findings"
}`;

      console.log('[GeminiImageVerification] Verifying with Gemini...');
      const response = await this._callGeminiAPIWithImage(prompt, imageBase64);
      
      this.validationStats.successes++;

      // Consolidate results
      return this._consolidateImageVerification(localResult, response);
    } catch (err) {
      console.warn('[GeminiImageVerification] Failed:', err.message);
      this.validationStats.failures++;
      return this._getDefaultImageVerification(localResult, 'fallback');
    }
  }

  /**
   * Consolidate local and Gemini image verification results
   */
  _consolidateImageVerification(localResult, geminiResult) {
    const consolidated = {
      timestamp: new Date().toISOString(),
      source: 'consolidated',
      
      // Local analysis component
      localAnalysis: {
        confidence: localResult.categoryMatch,
        detectedFeatures: localResult.detectedFeatures || [],
        detectedLabels: localResult.labels || []
      },

      // Gemini analysis component
      geminiAnalysis: {
        confidence: geminiResult.gemini_confidence || 0,
        categoryMatch: geminiResult.gemini_category_match || 'uncertain',
        additionalObjects: geminiResult.additional_detected_objects || [],
        alternativeSuggestion: geminiResult.alternative_category_suggestion || null,
        explanation: geminiResult.explanation || ''
      },

      // Consolidated decision
      final: {
        match: this._determineFinalMatch(localResult, geminiResult),
        confidence: this._calculateFinalConfidence(localResult, geminiResult),
        agreementLevel: geminiResult.agreement_level || 'unknown',
        requiresReview: geminiResult.agreement_level === 'disagreement' || 
                       (geminiResult.gemini_confidence < 0.6 && localResult.categoryMatch < 0.6),
        reasoning: `Local confidence: ${(localResult.categoryMatch * 100).toFixed(1)}% | Gemini confidence: ${(geminiResult.gemini_confidence * 100).toFixed(1)}% | Agreement: ${geminiResult.agreement_level}`
      }
    };

    return consolidated;
  }

  /**
   * Determine final match status from consolidated verification
   */
  _determineFinalMatch(localResult, geminiResult) {
    if (geminiResult.agreement_level === 'full') {
      if (geminiResult.gemini_category_match === 'match') return 'match';
      if (geminiResult.gemini_category_match === 'mismatch') return 'mismatch';
      return 'uncertain';
    }

    // Partial agreement or disagreement - use confidence levels
    const localConfidence = localResult.categoryMatch;
    const geminiConfidence = geminiResult.gemini_confidence;

    // If one is clearly higher, use that
    if (Math.abs(geminiConfidence - localConfidence) > 0.3) {
      const higher = geminiConfidence > localConfidence ? geminiResult.gemini_category_match : 
                     (localConfidence > 0.7 ? 'match' : 'uncertain');
      return higher;
    }

    // If both are low confidence
    if (localConfidence < 0.5 && geminiConfidence < 0.5) return 'uncertain';

    // Default to gemini if available
    return geminiResult.gemini_category_match;
  }

  /**
   * Calculate final consolidated confidence
   */
  _calculateFinalConfidence(localResult, geminiResult) {
    const weights = {
      full: { local: 0.4, gemini: 0.6 },      // Trust Gemini more when in full agreement
      partial: { local: 0.5, gemini: 0.5 },   // Equal weight for partial agreement
      disagreement: { local: 0.3, gemini: 0.7 } // Trust Gemini more when disagreeing
    };

    const weight = weights[geminiResult.agreement_level] || weights.partial;
    const localConfidence = localResult.categoryMatch;
    const geminiConfidence = geminiResult.gemini_confidence;

    return (localConfidence * weight.local) + (geminiConfidence * weight.gemini);
  }

  /**
   * Default image verification (fallback)
   */
  _getDefaultImageVerification(localResult, source) {
    return {
      timestamp: new Date().toISOString(),
      source: source,
      
      localAnalysis: {
        confidence: localResult.categoryMatch,
        detectedFeatures: localResult.detectedFeatures || [],
        detectedLabels: localResult.labels || []
      },

      geminiAnalysis: null,

      final: {
        match: localResult.categoryMatch > 0.7 ? 'match' : 
               (localResult.categoryMatch > 0.4 ? 'uncertain' : 'mismatch'),
        confidence: localResult.categoryMatch,
        agreementLevel: 'fallback',
        requiresReview: localResult.categoryMatch < 0.7,
        reasoning: 'Using local analysis only (Gemini unavailable)'
      }
    };
  }

  /**
   * Check if Gemini is available and working
   */
  async healthCheck() {
    if (!this.isAvailable) {
      return { available: false, reason: 'No API key configured' };
    }

    try {
      console.log('[GeminiHealthCheck] Testing with model:', this.model);
      const response = await this._callGeminiAPI('Respond with just "ok" in JSON: {"status": "ok"}');
      return { available: !!response, reason: response ? 'API is working' : 'API returned empty response' };
    } catch (err) {
      console.error('[GeminiHealthCheck] Failed:', err.message);
      console.error('[GeminiHealthCheck] This is expected if API key is invalid or quota exceeded');
      return { available: false, reason: err.message };
    }
  }

  /**
   * Get validation statistics
   */
  getStats() {
    const successRate = this.validationStats.attempts > 0 
      ? ((this.validationStats.successes / this.validationStats.attempts) * 100).toFixed(2)
      : 0;

    return {
      ...this.validationStats,
      successRate: `${successRate}%`,
      available: this.isAvailable
    };
  }
}

module.exports = new GeminiValidationService();
