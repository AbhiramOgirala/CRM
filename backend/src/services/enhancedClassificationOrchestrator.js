'use strict';
const nlp = require('./nlpService');
const semanticEmbedding = require('./semanticEmbeddingService');
const mlClassifier = require('./mlClassifierService');
const hybridEngine = require('./hybridDecisionEngine');
const geminiValidation = require('./geminiValidationService');
const imageProcessing = require('./imageProcessingService');
const huggingface = require('./huggingfaceService');

/**
 * Enhanced Classification Orchestrator
 * Coordinates all classification layers while preserving the original rule-based pipeline
 * Executes: Rule-based → HuggingFace → Hybrid → Gemini → Image Processing
 */
class EnhancedClassificationOrchestrator {
  constructor() {
    this.enableSemanticLayer = false; // Semantic layer disabled - HuggingFace API returning 410
    this.enableMLLayer = false; // ML layer disabled - service incomplete
    this.enableHuggingFaceLayer = huggingface.isAvailable; // HuggingFace enabled if API key available
    this.enableGeminiLayer = process.env.ENABLE_GEMINI_LAYER !== 'false';
    this.enableImageLayer = process.env.ENABLE_IMAGE_LAYER !== 'false';
    
    this.categoryEmbeddings = this._initializeCategoryEmbeddings();
    this.classificationLog = [];
    
    if (this.enableHuggingFaceLayer) {
      console.log('[Orchestrator] HuggingFace layer enabled ✅');
    }
  }

  /**
   * MAIN ENTRY POINT - Enhanced classification pipeline
   * Keeps original pipeline intact and adds enhancements
   */
  async classifyComplaint(input) {
    const startTime = Date.now();
    const logEntry = { timestamp: new Date().toISOString(), input: input.title };

    try {
      // ─────────────────────────────────────────────────────────────
      // STEP 1: EXECUTE ORIGINAL RULE-BASED PIPELINE (UNCHANGED)
      // ─────────────────────────────────────────────────────────────
      const ruleBased = this._executeRuleBasedPipeline(input);
      logEntry.ruleBased = ruleBased;

      // ─────────────────────────────────────────────────────────────
      // STEP 2: HUGGINGFACE CLASSIFICATION LAYER (PARALLEL)
      // ─────────────────────────────────────────────────────────────
      let textEmbedding = null; // Initialize for later reference
      let huggingfaceResult = null;
      if (this.enableHuggingFaceLayer) {
        const complaintText = [input.title, input.description, input.audio_transcript]
          .filter(Boolean)
          .join(' ');
        
        // Get available categories
        const categories = Object.keys(nlp.categoryPatterns || {});
        
        huggingfaceResult = await huggingface.classifyComplaint(complaintText, categories);
        logEntry.huggingfaceClassification = huggingfaceResult;
        
        console.log(`[HF Classification] ${huggingfaceResult.category} (${(huggingfaceResult.confidence * 100).toFixed(1)}%)`);
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 3: ML CLASSIFICATION LAYER
      // ─────────────────────────────────────────────────────────────
      let mlBased = null;
      // ML layer skipped - requires embedding from semantic layer

      // ─────────────────────────────────────────────────────────────
      // STEP 4: HYBRID DECISION ENGINE
      // ─────────────────────────────────────────────────────────────
      // Include HuggingFace results in hybrid decision
      const hybrid = hybridEngine.makeDecision(ruleBased, mlBased, huggingfaceResult);
      
      // Severity calibration
      const complaintText = [input.title, input.description].filter(Boolean).join(' ');
      let sentimentForCalibration = ruleBased.sentiment;
      
      // Use HuggingFace sentiment analysis if available
      if (this.enableHuggingFaceLayer && huggingfaceResult) {
        const hfSentiment = await huggingface.analyzeSentiment(complaintText);
        if (hfSentiment && hfSentiment.sentiment) {
          sentimentForCalibration = hfSentiment.sentiment.toLowerCase();
          logEntry.huggingfaceSentiment = hfSentiment;
        }
      }
      
      const severityCalibration = hybridEngine.calibrateSeverity(
        { text: input.description },
        ruleBased.priority,
        sentimentForCalibration
      );
      
      const multiLabelDecision = hybridEngine.decideMultiLabel(ruleBased, mlBased, huggingfaceResult);
      
      logEntry.hybrid = hybrid;
      logEntry.severityCalibration = severityCalibration;

      // ─────────────────────────────────────────────────────────────
      // STEP 5: IMAGE PROCESSING LAYER (PREPARE FOR UNIFIED VALIDATION)
      // ─────────────────────────────────────────────────────────────
      let imageValidation = null;
      let primaryImageBase64 = null;
      let localImageAnalysis = null;
      
      if (this.enableImageLayer && input.images && input.images.length > 0) {
        // Get first image for unified Gemini validation
        const firstImage = input.images[0];
        primaryImageBase64 = firstImage.buffer || firstImage;
        
        // Run local image analysis for first image
        const firstImageAnalysis = await imageProcessing.processImage(
          primaryImageBase64,
          hybrid.finalCategory,
          input.description
        );
        localImageAnalysis = firstImageAnalysis;
        
        // Process remaining images in parallel (for backup analysis)
        if (input.images.length > 1) {
          imageValidation = await Promise.all(
            input.images.slice(1, 3).map(img =>
              imageProcessing.processImage(
                img.buffer || img,
                hybrid.finalCategory,
                input.description
              )
            )
          );
        }
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 6: GEMINI UNIFIED VALIDATION (TEXT + IMAGE TOGETHER)
      // ─────────────────────────────────────────────────────────────
      let geminiResult = null;
      if (this.enableGeminiLayer && geminiValidation.isAvailable) {
        const complaintText = [input.title, input.description].filter(Boolean).join(' ');
        
        // 🔴 Unified Gemini call: text + image together (if image available)
        if (primaryImageBase64 && localImageAnalysis) {
          console.log('[GeminiUnified] Processing text + image together...');
          geminiResult = await geminiValidation.validateComplaintWithImage(
            complaintText,
            hybrid.finalCategory,
            primaryImageBase64,
            localImageAnalysis
          );
        } else {
          console.log('[GeminiText] Processing text only...');
          geminiResult = await geminiValidation.validateClassification(
            complaintText,
            hybrid.finalCategory,
            severityCalibration.calibratedPriority,
            ruleBased.keywords
          );
        }
        
        logEntry.geminiValidation = geminiResult;
        
        // 🔴 PRIORITY: Gemini verdict takes precedence
        if (geminiResult.suggested_category) {
          const geminiSuggestion = geminiResult.suggested_category;
          const hasGoodConfidence = geminiResult.category_confidence >= 0.5;
          
          if (geminiSuggestion && (geminiResult.should_override || hasGoodConfidence || !geminiResult.category_correct)) {
            console.log(`[GeminiPriority] Overriding with Gemini suggestion: ${geminiSuggestion} (confidence: ${(geminiResult.category_confidence * 100).toFixed(1)}%)`);
            hybrid.finalCategory = geminiSuggestion;
            hybrid.finalConfidence = geminiResult.category_confidence;
            hybrid.geminiAdjusted = true;
            logEntry.geminiOverride = true;
          }
        }
        
        // Also prioritize Gemini's priority suggestion if confident
        if (geminiResult.suggested_priority && geminiResult.priority_confidence >= 0.6) {
          console.log(`[GeminiPriority] Overriding priority with Gemini: ${geminiResult.suggested_priority} (confidence: ${(geminiResult.priority_confidence * 100).toFixed(1)}%)`);
          severityCalibration.calibratedPriority = geminiResult.suggested_priority;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Add first image analysis to results if available
      // ─────────────────────────────────────────────────────────────
      if (localImageAnalysis) {
        if (!imageValidation) imageValidation = [];
        imageValidation.unshift(localImageAnalysis);
      }
      
      // Log image analysis results
      if (imageValidation && imageValidation.length > 0) {
        const catInfo = imageProcessing.getCategoryInfo(hybrid.finalCategory);
        for (let i = 0; i < imageValidation.length; i++) {
          const imgResult = imageValidation[i];
          const isMismatch = imgResult.consolidated?.textImageMatch === 'mismatch' || imgResult.match === 'mismatch';
          
          if (isMismatch) {
            console.log(`\n📊 Image Analysis Result: ${imgResult.consolidated?.status || 'MISMATCH'}`);
            console.log(`Category: ${hybrid.finalCategory}`);
            console.log(`Department: ${catInfo.dept}`);
            console.log(`Priority: ${catInfo.priority.toUpperCase()}`);
            console.log(`Image Confidence: ${(imgResult.consolidated?.overallConfidence * 100).toFixed(1)}%`);
            console.log(`Department Confidence: ${(imgResult.consolidated?.overallConfidence * 100).toFixed(1)}%`);
            console.log(`Final Confidence: ${(imgResult.consolidated?.overallConfidence * 100).toFixed(2)}%`);
            
            // Show detailed Gemini analysis when there's a mismatch
            if (imgResult.gemini) {
              console.log(`\n🔍 Image Analysis Details:`);
              console.log(`   What's in the image: ${(imgResult.gemini.detectedObjects && imgResult.gemini.detectedObjects.length > 0) 
                ? imgResult.gemini.detectedObjects.join(', ') 
                : 'Unable to detect specific objects'}`);
              
              if (imgResult.gemini.issues && imgResult.gemini.issues !== 'none') {
                console.log(`   Issues detected: ${imgResult.gemini.issues}`);
              }
              
              console.log(`   Category match analysis:`);
              console.log(`   - Matches complaint text: ${imgResult.gemini.categoryMatchesText ? '✅' : '❌'}`);
              console.log(`   - Matches image content: ${imgResult.gemini.categoryMatchesImage ? '✅' : '❌'}`);
              
              if (imgResult.gemini.explanation) {
                console.log(`   Summary: ${imgResult.gemini.explanation}`);
              }
            }
            
            console.log(`⚠️ This image may need manual review\n`);
          } else {
            console.log(`🖼️  [IMAGE-ANALYSIS] Image #${i + 1} | Status: ${imgResult.consolidated?.status || imgResult.match} | Confidence: ${(imgResult.consolidated?.overallConfidence * 100).toFixed(2)}% | Dept: ${catInfo.dept} | Priority: ${catInfo.priority}`);
          }
        }
        
        // Check for mismatches
        const hasMismatch = imageValidation.some(img => img.match === 'mismatch');
        if (hasMismatch) {
          hybrid.requiresManualReview = true;
          logEntry.imageMismatchDetected = true;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // FINAL OUTPUT
      // ─────────────────────────────────────────────────────────────
      const finalResult = {
        // Core classification
        final_category: hybrid.finalCategory,
        all_labels: multiLabelDecision.labels,
        priority: severityCalibration.calibratedPriority,
        sentiment: ruleBased.sentiment,
        keywords: ruleBased.keywords,
        sub_category: ruleBased.subCategory,
        sla_hours: ruleBased.slaHours,
        department: ruleBased.deptName,
        department_code: ruleBased.deptCode,

        // Confidence scoring
        confidence: this._calculateFinalConfidence(hybrid, geminiResult),
        confidence_breakdown: {
          rule_based: ruleBased.confidence,
          ml_based: mlBased?.confidence || 0,
          gemini: geminiResult?.category_confidence || 0,
          hybrid: hybrid.finalConfidence
        },

        // Enhancement indicators
        requires_review: hybrid.requiresManualReview || (imageValidation?.some(img => img.requiresReview)),
        gemini_adjusted: hybrid.geminiAdjusted || false,
        multi_label: multiLabelDecision.multiLabel,
        conflict_detected: hybrid.conflictDetected,
        severity_calibrated: severityCalibration.originalPriority !== severityCalibration.calibratedPriority,

        // Metadata
        processing_time_ms: Date.now() - startTime,
        enhancements_applied: {
          huggingface: !!huggingfaceResult,
          semantic: !!textEmbedding,
          ml: !!mlBased,
          gemini: !!geminiResult,
          image: !!imageValidation
        },
        
        // Detailed insights (optional)
        internal: {
          rule_based: ruleBased,
          huggingface_result: huggingfaceResult,
          semantic_embedding: textEmbedding ? { dimension: textEmbedding.length } : null,
          ml_based: mlBased,
          hybrid_decision: hybrid,
          gemini_result: geminiResult,
          image_validation: imageValidation,
          severity_calibration: severityCalibration
        }
      };

      logEntry.finalResult = {
        category: finalResult.final_category,
        confidence: finalResult.confidence,
        requiresReview: finalResult.requires_review,
        processingTime: finalResult.processing_time_ms
      };
      logEntry.success = true;

      this._saveLog(logEntry);
      return finalResult;

    } catch (err) {
      console.error('[EnhancedClassification] Error:', err);
      logEntry.error = err.message;
      logEntry.success = false;
      this._saveLog(logEntry);

      // Fallback to rule-based only
      return this._createFallbackResult(input);
    }
  }

  /**
   * Execute original rule-based pipeline (UNCHANGED)
   */
  _executeRuleBasedPipeline(input) {
    const fullText = [input.title, input.description, input.audio_transcript]
      .filter(Boolean)
      .join(' ');

    return nlp.classify(fullText);
  }

  /**
   * Calculate final weighted confidence
   */
  _calculateFinalConfidence(hybrid, geminiResult) {
    // 🔴 PRIORITY: If Gemini adjusted the classification, use its confidence directly
    if (hybrid.geminiAdjusted && hybrid.finalConfidence) {
      console.log(`[FinalConfidence] Using Gemini-adjusted confidence: ${(hybrid.finalConfidence * 100).toFixed(2)}%`);
      return Math.min(Math.max(hybrid.finalConfidence, 0), 1);
    }

    let confidence = hybrid.finalConfidence;

    // Boost confidence if Gemini validates and agrees
    if (geminiResult && geminiResult.category_correct && geminiResult.category_confidence > 0.5) {
      const geminiBoost = geminiResult.category_confidence * 0.3;
      confidence = Math.min(confidence + geminiBoost, 0.99);
      console.log(`[FinalConfidence] Gemini validation boost: +${(geminiBoost * 100).toFixed(2)}% → ${(confidence * 100).toFixed(2)}%`);
    }

    // Reduce confidence if conflict detected
    if (hybrid.conflictDetected) {
      confidence = Math.min(confidence * 0.85, 0.95);
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Create fallback result (original rule-based only)
   */
  _createFallbackResult(input) {
    const ruleBased = nlp.classify(
      [input.title, input.description, input.audio_transcript]
        .filter(Boolean)
        .join(' ')
    );

    return {
      final_category: ruleBased.category,
      all_labels: [ruleBased.category],
      priority: ruleBased.priority,
      sentiment: ruleBased.sentiment,
      keywords: ruleBased.keywords,
      sub_category: ruleBased.subCategory,
      sla_hours: ruleBased.slaHours,
      department: ruleBased.deptName,
      department_code: ruleBased.deptCode,
      confidence: ruleBased.confidence,
      confidence_breakdown: {
        rule_based: ruleBased.confidence,
        ml_based: 0,
        gemini: 0,
        hybrid: ruleBased.confidence
      },
      requires_review: false,
      gemini_adjusted: false,
      multi_label: false,
      conflict_detected: false,
      severity_calibrated: false,
      processing_time_ms: 0,
      enhancements_applied: { semantic: false, ml: false, gemini: false, image: false },
      internal: { rule_based: ruleBased }
    };
  }

  /**
   * Initialize pre-computed category embeddings
   */
  _initializeCategoryEmbeddings() {
    // These should be pre-computed using all-mpnet-base-v2 model
    // For now, returning structure that will be populated dynamically
    return {
      roads: new Array(768).fill(0),
      water_supply: new Array(768).fill(0),
      electricity: new Array(768).fill(0),
      waste_management: new Array(768).fill(0),
      drainage: new Array(768).fill(0),
      infrastructure: new Array(768).fill(0),
      parks: new Array(768).fill(0),
      health: new Array(768).fill(0),
      education: new Array(768).fill(0),
      public_services: new Array(768).fill(0),
      law_enforcement: new Array(768).fill(0),
      street_lights: new Array(768).fill(0),
      noise_pollution: new Array(768).fill(0),
      other: new Array(768).fill(0)
    };
  }

  /**
   * Save classification log
   */
  _saveLog(entry) {
    this.classificationLog.push(entry);
    
    // Keep last 500 entries in memory
    if (this.classificationLog.length > 500) {
      this.classificationLog.shift();
    }
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    const successful = this.classificationLog.filter(l => l.success).length;
    const failed = this.classificationLog.filter(l => !l.success).length;
    const conflicts = this.classificationLog.filter(l => l.hybrid?.conflictDetected).length;

    const avgTime = this.classificationLog.length > 0
      ? this.classificationLog.reduce((sum, l) => sum + (l.finalResult?.processingTime || 0), 0) / this.classificationLog.length
      : 0;

    return {
      totalProcessed: this.classificationLog.length,
      successful,
      failed,
      successRate: `${((successful / (successful + failed)) * 100).toFixed(2)}%`,
      conflictsDetected: conflicts,
      avgProcessingTimeMs: avgTime.toFixed(0),
      enhancements: {
        semantic: this.enableSemanticLayer,
        ml: this.enableMLLayer,
        gemini: this.enableGeminiLayer,
        image: this.enableImageLayer
      }
    };
  }
}

module.exports = new EnhancedClassificationOrchestrator();
