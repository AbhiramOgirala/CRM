# Enhanced Classification - Developer API Reference

## Quick Reference

### Enable in Development

```bash
# .env
USE_ENHANCED_CLASSIFICATION=true
ENABLE_SEMANTIC_LAYER=true
ENABLE_ML_LAYER=true
ENABLE_GEMINI_LAYER=false      # Skip for speed
ENABLE_IMAGE_LAYER=false       # Skip for testing

# Start
PORT=8000 npm start
```

---

## Services API

### 1. Semantic Embedding Service

**File:** `src/services/semanticEmbeddingService.js`

```javascript
const semanticEmbedding = require('./services/semanticEmbeddingService');

// Generate embedding for text
const embedding = await semanticEmbedding.generateEmbedding(text);
// Returns: Float32Array[768]

// Calculate similarity between two embeddings
const similarity = semanticEmbedding.cosineSimilarity(vec1, vec2);
// Returns: Number (0-1)

// Find most similar category
const result = semanticEmbedding.findMostSimilarCategory(embedding, categoryEmbeddings);
// Returns: { category: "roads", similarity: 0.89 }
```

**Configuration:**
```javascript
this.HF_MODEL = 'sentence-transformers/all-mpnet-base-v2';
this.EMBEDDING_DIM = 768;
this.HF_API_KEY = process.env.HF_API_KEY;
```

---

### 2. ML Classifier Service

**File:** `src/services/mlClassifierService.js`

```javascript
const mlClassifier = require('./services/mlClassifierService');

// Simple k-NN classification
const result = mlClassifier.classify(embedding, categoryEmbeddings);
// Returns: {
//   labels: ["roads"],
//   confidence: 0.82,
//   scores: { roads: 0.82, water: 0.12, ... },
//   primary: "roads"
// }

// Bayesian classification
const bayesScores = mlClassifier.bayesianClassify(keywords, categoryKeywordProbs);
// Returns: { roads: 0.85, water: 0.12, ... }

// Ensemble (combines k-NN + Bayesian)
const ensemble = mlClassifier.ensembleClassify(
  embedding, 
  keywords, 
  categoryEmbeddings, 
  categoryKeywordProbs
);
// Returns: { labels, confidence, scores, method: "ensemble" }

// Detect anomalies
const anomaly = mlClassifier.detectAnomalies(embedding, categoryEmbeddings);
// Returns: { isAnomaly: false, maxSimilarity: 0.82, avgSimilarity: 0.45 }

// Update with training example
mlClassifier.addTrainingExample(text, embedding, category);

// Get stats
mlClassifier.getStats();
// Returns: { trainingExamples: 42, categoriesInitialized: 14 }
```

---

### 3. Hybrid Decision Engine

**File:** `src/services/hybridDecisionEngine.js`

```javascript
const hybridEngine = require('./services/hybridDecisionEngine');

// Make decision by merging rule-based + ML results
const decision = hybridEngine.makeDecision(ruleBased, mlBased);
// Returns: {
//   ruleBased: { category: "roads", ... },
//   mlBased: { labels: ["roads"], ... },
//   finalCategory: "roads",
//   finalConfidence: 0.89,
//   conflictDetected: false,
//   conflictStrategy: "agreement-high-confidence",
//   requiresManualReview: false
// }

// Calibrate severity (emotion vs reality)
const calibrated = hybridEngine.calibrateSeverity(
  classification,
  priority,     // "high"
  sentiment     // "negative"
);
// Returns: {
//   originalPriority: "high",
//   calibratedPriority: "medium",    // Capped if very emotional
//   adjustmentReason: "...",
//   recommendation: "Verify urgency with citizen"
// }

// Multi-label decision
const multiLabel = hybridEngine.decideMultiLabel(
  ruleBased, 
  mlBased, 
  0.65  // confidence threshold
);
// Returns: {
//   labels: ["roads", "infrastructure"],
//   multiLabel: true,
//   labelConfidences: { rule_based: 0.85, ml_based: 0.91 }
// }

// Log for audit trail
hybridEngine.logDecision(complaintId, decision, geminiResult);

// Get statistics
hybridEngine.getStats();
// Returns: {
//   totalDecisions: 100,
//   conflicts: 3,
//   conflictRate: "3.00%",
//   geminiUsed: 45,
//   geminiAdjusted: 8,
//   avgConfidence: "0.8742"
// }
```

---

### 4. Gemini Validation Service

**File:** `src/services/geminiValidationService.js`

```javascript
const geminiValidation = require('./services/geminiValidationService');

// Validate classification (text only)
const validated = await geminiValidation.validateClassification(
  complaintText,      // Full complaint
  predictedCategory,  // "roads"
  priority,          // "high"
  keywords           // ["pothole", "street", ...]
);
// Returns: {
//   category_correct: true,
//   category_confidence: 0.95,
//   priority_correct: false,
//   priority_confidence: 0.7,
//   suggested_priority: "medium",
//   should_override: false,
//   reasoning: "Classification is accurate",
//   source: "gemini",
//   adjusted: false
// }

// Validate image against category (requires vision API)
const imageValidated = await geminiValidation.validateImageMatch(
  imageBase64,      // Image in base64
  category,         // "roads"
  complaintText     // "Pothole on..."
);
// Returns: {
//   match: "match" | "mismatch" | "uncertain",
//   confidence: 0.89,
//   objects_detected: ["pothole", "asphalt", "street"],
//   explanation: "Image shows a clear pothole"
// }

// Health check
const health = await geminiValidation.healthCheck();
// Returns: { available: true, reason: "API is working" }

// Get stats
geminiValidation.getStats();
// Returns: {
//   attempts: 50,
//   successes: 48,
//   failures: 2,
//   successRate: "96.00%",
//   available: true
// }
```

---

### 5. Image Processing Service

**File:** `src/services/imageProcessingService.js`

```javascript
const imageProcessing = require('./services/imageProcessingService');

// Process complaint image (full pipeline)
const result = await imageProcessing.processImage(
  imageBuffer,    // File buffer
  category,       // "roads"
  complaintText   // Description
);
// Returns: {
//   timestamp: "2026-03-21T...",
//   category: "roads",
//   match: "match" | "mismatch" | "uncertain",
//   confidence: 0.85,
//   requiresReview: false,
//   detectedLabels: ["pothole", "asphalt", "street"],
//   localAnalysis: { ... },
//   geminiAnalysis: { ... }
// }

// Get stats
imageProcessing.getStats();
// Returns: {
//   totalProcessed: 156,
//   avgConfidence: "0.823",
//   matchDistribution: { match: 120, mismatch: 12, uncertain: 24 }
// }
```

---

### 6. Enhanced Classification Orchestrator

**File:** `src/services/enhancedClassificationOrchestrator.js`

```javascript
const orchestrator = require('./services/enhancedClassificationOrchestrator');

// Main entry point - classifies complaint with all layers
const result = await orchestrator.classifyComplaint({
  title: "Pothole on Main Street",
  description: "Dangerous 3-foot pothole...",
  audio_transcript: null,
  images: [buffer1, buffer2]  // Optional
});

// Returns comprehensive result:
{
  final_category: "roads",
  all_labels: ["roads", "infrastructure"],
  priority: "high",
  sentiment: "negative",
  keywords: ["pothole", "street"],
  sub_category: "pothole",
  sla_hours: 24,
  department: "Public Works Department",
  confidence: 0.89,
  
  confidence_breakdown: {
    rule_based: 0.85,
    ml_based: 0.91,
    gemini: 0.95,
    hybrid: 0.89
  },
  
  requires_review: false,
  gemini_adjusted: false,
  multi_label: true,
  conflict_detected: false,
  
  processing_time_ms: 856,
  
  enhancements_applied: {
    semantic: true,
    ml: true,
    gemini: true,
    image: true
  }
}

// Get orchestrator statistics
orchestrator.getStats();
// Returns: {
//   totalProcessed: 256,
//   successful: 248,
//   failed: 8,
//   successRate: "96.88%",
//   conflictsDetected: 12,
//   avgProcessingTimeMs: "845",
//   enhancements: {
//     semantic: true,
//     ml: true,
//     gemini: false,
//     image: false
//   }
// }
```

---

## Controller Usage

### Preview Classification Endpoint

```javascript
// GET /api/complaints/preview-classification
// Uses orchestrator if enabled, falls back to rule-based

exports.previewClassification = async (req, res) => {
  const { text } = req.body;
  
  if (USE_ENHANCED_CLASSIFICATION && enhancedOrchestrator) {
    const enhanced = await enhancedOrchestrator.classifyComplaint({
      title: text,
      description: text
    });
    // Return enhanced result with all enhancements data
  } else {
    // Use original NLP
    const r = nlp.classify(text);
    // Return original format
  }
};
```

### File Complaint Endpoint

```javascript
// POST /api/complaints/file
// Uses orchestrator for classification

exports.fileComplaint = async (req, res) => {
  // 1. Classify (enhanced if enabled)
  const classification = USE_ENHANCED_CLASSIFICATION 
    ? await orchestrator.classifyComplaint(input)
    : nlp.classify(input.text);
  
  // 2. Store in database with metadata
  const complaint = {
    category: classification.final_category,
    priority: classification.priority,
    enhanced_metadata: classification.internal,
    requires_review: classification.requires_review
  };
  
  // 3. Save & continue
};
```

---

## Environment Variables

### Master Control
```env
# true = enable all enhancements (if not explicitly disabled)
# false = use only original rule-based pipeline
USE_ENHANCED_CLASSIFICATION=false
```

### Layer Control
```env
# Individual layer on/off (only if master is true)
ENABLE_SEMANTIC_LAYER=true
ENABLE_ML_LAYER=true
ENABLE_GEMINI_LAYER=true
ENABLE_IMAGE_LAYER=true
```

### API Keys
```env
# HuggingFace (for embeddings)
HF_API_KEY=hf_xxxxxxxxxxxxx

# Google Gemini (for LLM validation)
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxx
```

---

## Response Format

### With Enhanced Classification

```json
{
  "final_category": "roads",
  "all_labels": ["roads", "infrastructure"],
  "priority": "high",
  "confidence": 0.89,
  "confidence_breakdown": {
    "rule_based": 0.85,
    "ml_based": 0.91,
    "gemini": 0.95,
    "hybrid": 0.89
  },
  "requires_review": false,
  "gemini_adjusted": false,
  "multi_label": true,
  "processing_time_ms": 856,
  "enhancements_applied": {
    "semantic": true,
    "ml": true,
    "gemini": true,
    "image": false
  }
}
```

### Without Enhancement (Default)

```json
{
  "category": "roads",
  "confidence": 0.85,
  "priority": "high",
  "keywords": ["pothole", "street"],
  "sub_category": "pothole",
  "sla_hours": 24
}
```

---

## Error Handling

### Graceful Fallbacks

```javascript
try {
  // Try enhanced classification
  const result = await orchestrator.classifyComplaint(input);
  return result;
} catch (err) {
  // Falls back to rule-based automatically
  console.warn('Enhanced classification failed:', err);
  return createFallbackResult(input);
}
```

### Part Failure

- Semantic fails → Uses hash-based embedding ✓
- ML fails → Uses rule-based only ✓
- Gemini fails → Uses hybrid result ✓
- Image fails → Continues without check ✓
- All fail → Returns rule-based result ✓

---

## Testing

### Unit Tests

```bash
# Test each service independently
node -e "
  const emb = require('./src/services/semanticEmbeddingService');
  emb.generateEmbedding('test').then(e => console.log('Embedding OK'));
"

# Test ML classifier
node -e "
  const ml = require('./src/services/mlClassifierService');
  console.log(ml.getStats());
"

# Test orchestrator
node -e "
  const orch = require('./src/services/enhancedClassificationOrchestrator');
  orch.classifyComplaint({title: 'test', description: 'test'})
    .then(r => console.log('Classification:', r.final_category));
"
```

### Integration Tests

```bash
# Preview with enhancement
curl -X POST http://localhost:8000/api/complaints/preview-classification \
  -H "Content-Type: application/json" \
  -d '{"text": "Pothole on street"}'

# File complaint with enhancement
curl -X POST http://localhost:8000/api/complaints/file \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"title": "Pothole", "description": "..."}'
```

---

## Performance Tuning

### Disable Slow Layers for Speed

```env
# Fast classification (~200ms)
USE_ENHANCED_CLASSIFICATION=true
ENABLE_SEMANTIC_LAYER=false
ENABLE_ML_LAYER=false
ENABLE_GEMINI_LAYER=false
ENABLE_IMAGE_LAYER=false
```

### Full Features (~2s)

```env
# Comprehensive classification
USE_ENHANCED_CLASSIFICATION=true
ENABLE_SEMANTIC_LAYER=true
ENABLE_ML_LAYER=true
ENABLE_GEMINI_LAYER=true
ENABLE_IMAGE_LAYER=true
```

---

## Monitoring

### Check Service Health

```javascript
// In backend console:
const orch = require('./src/services/enhancedClassificationOrchestrator');
const hybrid = require('./src/services/hybridDecisionEngine');
const gemini = require('./src/services/geminiValidationService');

console.log('Orchestrator:', orch.getStats());
console.log('Hybrid:', hybrid.getStats());
console.log('Gemini:', gemini.getStats());
```

### Log Analysis

```javascript
// Access classification logs (last 500)
orch.classificationLog.forEach((entry, i) => {
  console.log(`[${i}] ${entry.input} → ${entry.finalResult.category}`);
});
```

---

**Reference Updated:** March 21, 2026  
**Version:** 1.0  
**Status:** Complete ✅
