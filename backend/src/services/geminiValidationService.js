'use strict';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');

// Cache Gemini validation results for 12 hours
const geminiCache = new NodeCache({ stdTTL: 43200 });

/**
 * Gemini Validation Service (using official SDK)
 * Uses Google's Gemini API to validate and refine classifications
 * Primary model: gemini-2.5-flash
 * Fallback model: gemini-3.1-flash-lite-preview
 */
class GeminiValidationService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.primaryModel = 'gemini-2.5-flash';
    this.fallbackModel = 'gemini-3.1-flash-lite-preview';
    this.currentModel = this.primaryModel;
    this.isAvailable = !!this.client;
    this.validationStats = { attempts: 0, successes: 0, failures: 0, fallbackUsed: 0 };

    if (this.isAvailable) {
      console.log('[GeminiService] Initialized with official SDK');
      console.log('[GeminiService] Primary model:', this.primaryModel);
      console.log('[GeminiService] Fallback model:', this.fallbackModel);
    } else {
      console.warn('[GeminiService] No API key - Gemini validation disabled');
    }
  }

  /**
   * Validate complaint classification and priority
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
   * Generate a concise complaint title from complaint text.
   * Automatically generates title in the same language as the input text.
   */
  async generateComplaintTitle(complaintText, category = 'other', priority = 'medium') {
    if (!this.isAvailable || !complaintText?.trim()) return null;

    const normalized = complaintText.trim().replace(/\s+/g, ' ');
    const cacheKey = `title_${category}_${priority}_${normalized.substring(0, 80)}`;
    const cached = geminiCache.get(cacheKey);
    if (cached?.title) return cached;

    const prompt = `You generate short civic complaint titles in the SAME LANGUAGE as the input text.

INPUT:
- Category: ${category}
- Priority: ${priority}
- Complaint text: "${normalized}"

CRITICAL RULES:
- Detect the language of the complaint text (English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Bengali, Urdu, etc.)
- Generate the title in THE EXACT SAME LANGUAGE as the complaint text
- Title must be clear and specific
- 4 to 10 words only
- Plain sentence case, no emojis
- Avoid quotes and punctuation-heavy output
- If complaint is in Telugu, title must be in Telugu
- If complaint is in Hindi, title must be in Hindi
- If complaint is in English, title must be in English

Respond ONLY valid JSON:
{"title":"..."}`;

    try {
      // Try primary model first
      console.log('[GeminiTitleGeneration] Using primary model:', this.currentModel);
      const model = this.client.getGenerativeModel({ model: this.currentModel });
      const result = await model.generateContent(prompt);
      const responseText = result?.response?.text?.() || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      const parsed = JSON.parse(jsonMatch[0]);
      const title = this._sanitizeGeneratedTitle(parsed.title);
      if (!title) throw new Error('Empty title generated');

      const payload = { title, source: 'gemini', model: this.currentModel };
      geminiCache.set(cacheKey, payload);
      return payload;
    } catch (primaryErr) {
      console.warn('[GeminiTitleGeneration] Primary model failed:', primaryErr.message);
      
      // Try fallback model
      try {
        console.log('[GeminiTitleGeneration] Trying fallback model:', this.fallbackModel);
        const fallbackModel = this.client.getGenerativeModel({ model: this.fallbackModel });
        const result = await fallbackModel.generateContent(prompt);
        const responseText = result?.response?.text?.() || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        const title = this._sanitizeGeneratedTitle(parsed.title);
        if (!title) return null;

        this.validationStats.fallbackUsed++;
        const payload = { title, source: 'gemini-fallback', model: this.fallbackModel };
        geminiCache.set(cacheKey, payload);
        return payload;
      } catch (fallbackErr) {
        console.warn('[GeminiTitleGeneration] Fallback also failed:', fallbackErr.message);
        return null;
      }
    }
  }

  _sanitizeGeneratedTitle(title) {
    if (!title || typeof title !== 'string') return '';
    const cleaned = title
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/["'`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '';
    return cleaned.substring(0, 90);
  }

  /**
   * Validate image against complaint category
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
   * Call Gemini API using official SDK with automatic fallback
   */
  async _callGeminiAPI(prompt) {
    // Try primary model first
    try {
      console.log('[GeminiAPI] Calling primary model:', this.currentModel);
      const model = this.client.getGenerativeModel({ model: this.currentModel });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      console.log('[GeminiAPI] Success with', this.currentModel);

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          source: 'gemini',
          model: this.currentModel,
          timestamp: new Date().toISOString(),
          adjusted: parsed.should_override || !parsed.category_correct
        };
      }

      throw new Error('No JSON found in response');
    } catch (primaryErr) {
      console.warn('[GeminiAPI] Primary model failed:', primaryErr.message);
      
      // Try fallback model if primary fails
      if (this.currentModel === this.primaryModel) {
        try {
          console.log('[GeminiAPI] Attempting fallback model:', this.fallbackModel);
          const fallbackModel = this.client.getGenerativeModel({ model: this.fallbackModel });
          
          const result = await fallbackModel.generateContent(prompt);
          const response = result.response;
          const responseText = response.text();

          console.log('[GeminiAPI] Success with fallback model');
          this.validationStats.fallbackUsed++;

          // Extract JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              ...parsed,
              source: 'gemini-fallback',
              model: this.fallbackModel,
              timestamp: new Date().toISOString(),
              adjusted: parsed.should_override || !parsed.category_correct
            };
          }

          throw new Error('No JSON found in fallback response');
        } catch (fallbackErr) {
          console.error('[GeminiAPI] Fallback model also failed:', fallbackErr.message);
          throw new Error(`Both models failed - Primary: ${primaryErr.message}, Fallback: ${fallbackErr.message}`);
        }
      }
      
      throw primaryErr;
    }
  }

  /**
   * Parse data URL and extract mime type + base64
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
   * Call Gemini API with image using official SDK with automatic fallback
   */
  async _callGeminiAPIWithImage(prompt, imageBase64) {
    // Parse image data once (handle both data URL and pure base64)
    const { base64, mimeType } = this._parseImageData(imageBase64);

    if (!base64) {
      throw new Error('No valid base64 image data found');
    }

    console.log('[GeminiImageAPI] Image size: ~' + imageBase64.length + ' chars');
    console.log('[GeminiImageAPI] Extracted mime type:', mimeType);
    console.log('[GeminiImageAPI] Base64 length:', base64.length, 'chars');

    // Try primary model first
    try {
      console.log('[GeminiImageAPI] Calling primary model with image:', this.currentModel);
      const model = this.client.getGenerativeModel({ model: this.currentModel });

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

      const response = result?.response;
      if (!response) {
        throw new Error('No response from model');
      }

      const responseText = response.text();
      console.log('[GeminiImageAPI] Success with primary model');

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return {
          ...JSON.parse(jsonMatch[0]),
          source: 'gemini-vision',
          model: this.currentModel,
          timestamp: new Date().toISOString()
        };
      }

      throw new Error('No JSON found in vision response');
    } catch (primaryErr) {
      console.warn('[GeminiImageAPI] Primary model failed:', primaryErr.message);
      
      // Try fallback model
      try {
        console.log('[GeminiImageAPI] Trying fallback model with image:', this.fallbackModel);
        const fallbackModel = this.client.getGenerativeModel({ model: this.fallbackModel });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timeout')), 30000)
        );

        const result = await Promise.race([
          fallbackModel.generateContent([
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

        const response = result?.response;
        if (!response) {
          throw new Error('No response from fallback model');
        }

        const responseText = response.text();
        console.log('[GeminiImageAPI] Success with fallback model');
        this.validationStats.fallbackUsed++;

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return {
            ...JSON.parse(jsonMatch[0]),
            source: 'gemini-vision-fallback',
            model: this.fallbackModel,
            timestamp: new Date().toISOString()
          };
        }

        throw new Error('No JSON found in fallback vision response');
      } catch (fallbackErr) {
        console.error('[GeminiImageAPI] Both models failed - Primary:', primaryErr.message, 'Fallback:', fallbackErr.message);
        throw new Error(`Both vision models failed - Primary: ${primaryErr.message}, Fallback: ${fallbackErr.message}`);
      }
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
      full: { local: 0.4, gemini: 0.6 },
      partial: { local: 0.5, gemini: 0.5 },
      disagreement: { local: 0.3, gemini: 0.7 }
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
      return { 
        available: false, 
        reason: 'No API key configured',
        primaryModel: this.primaryModel,
        fallbackModel: this.fallbackModel
      };
    }

    const results = {
      primaryModel: this.primaryModel,
      fallbackModel: this.fallbackModel,
      primaryStatus: 'unknown',
      fallbackStatus: 'unknown',
      available: false,
      reason: ''
    };

    // Test primary model
    try {
      console.log('[GeminiHealthCheck] Testing primary model:', this.primaryModel);
      const model = this.client.getGenerativeModel({ model: this.primaryModel });
      const result = await model.generateContent('Respond with just "ok" in JSON: {"status": "ok"}');
      const response = result?.response?.text?.();
      
      if (response && response.includes('ok')) {
        results.primaryStatus = 'working';
        results.available = true;
        results.reason = 'Primary model is working';
        console.log('[GeminiHealthCheck] Primary model is working');
      } else {
        results.primaryStatus = 'error';
        console.warn('[GeminiHealthCheck] Primary model returned unexpected response');
      }
    } catch (err) {
      results.primaryStatus = 'error';
      results.primaryError = err.message;
      console.error('[GeminiHealthCheck] Primary model failed:', err.message);
    }

    // Test fallback model
    try {
      console.log('[GeminiHealthCheck] Testing fallback model:', this.fallbackModel);
      const model = this.client.getGenerativeModel({ model: this.fallbackModel });
      const result = await model.generateContent('Respond with just "ok" in JSON: {"status": "ok"}');
      const response = result?.response?.text?.();
      
      if (response && response.includes('ok')) {
        results.fallbackStatus = 'working';
        if (!results.available) {
          results.available = true;
          results.reason = 'Fallback model is working (primary failed)';
        }
        console.log('[GeminiHealthCheck] Fallback model is working');
      } else {
        results.fallbackStatus = 'error';
        console.warn('[GeminiHealthCheck] Fallback model returned unexpected response');
      }
    } catch (err) {
      results.fallbackStatus = 'error';
      results.fallbackError = err.message;
      console.error('[GeminiHealthCheck] Fallback model failed:', err.message);
    }

    if (!results.available) {
      results.reason = 'Both models failed - check API key and quota';
    }

    return results;
  }

  /**
   * Get validation statistics
   */
  getStats() {
    const successRate = this.validationStats.attempts > 0
      ? ((this.validationStats.successes / this.validationStats.attempts) * 100).toFixed(2)
      : 0;

    const fallbackRate = this.validationStats.attempts > 0
      ? ((this.validationStats.fallbackUsed / this.validationStats.attempts) * 100).toFixed(2)
      : 0;

    return {
      ...this.validationStats,
      successRate: `${successRate}%`,
      fallbackRate: `${fallbackRate}%`,
      available: this.isAvailable,
      primaryModel: this.primaryModel,
      fallbackModel: this.fallbackModel,
      currentModel: this.currentModel
    };
  }
}

module.exports = new GeminiValidationService();
