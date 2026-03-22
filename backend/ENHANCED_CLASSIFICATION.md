# Enhanced CRM Classification Pipeline - Documentation

## Overview

The enhanced classification pipeline builds upon the existing rule-based NLP classifier by adding **semantic embeddings**, **ML-based classification**, **hybrid decision making**, **Gemini API validation**, and **image processing** capabilities.

**Key Principle:** The original rule-based pipeline is **100% preserved and executed fully**. All enhancements are **added as additional layers** that run parallel to or after the original pipeline.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Input Complaint                              │
│          (title + description + audio_transcript + images)      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│    LAYER 1: RULE-BASED PIPELINE (ORIGINAL - PRESERVED)          │
│  • Text preprocessing                                            │
│  • Category scoring (14 categories)                              │
│  • Priority detection                                            │
│  • Sentiment analysis                                            │
│  • Keyword extraction                                            │
│  • Sub-category detection                                        │
│  • SLA calculation                                               │
│  • Department routing                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐  ┌─────────────┐  ┌─────────────┐
    │ LAYER 2│  │   LAYER 3   │  │   LAYER 4   │
    │Semantic│  │     ML      │  │   Hybrid    │
    │ Embed  │  │ Classifier  │  │   Engine    │
    └────────┘  └─────────────┘  └─────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
                ┌─────────────────────┐
                │  LAYER 5: Gemini    │
                │  Validation (LLM)   │
                └─────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
    ┌──────────────┐           ┌─────────────────┐
    │ LAYER 6:     │           │ Final Decision  │
    │ Image        │           │ & Confidence    │
    │ Validation   │           │ Scoring         │
    └──────────────┘           └─────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Result with          │
            │  • Main category      │
            │  • All labels         │
            │  • Confidence scores  │
            │  • Assessment flags   │
            │  • Requires review?   │
            └───────────────────────┘
```

---

## Configuration

All enhancement layers are controlled via **environment variables** in `.env`:

```env
# Master enable flag
USE_ENHANCED_CLASSIFICATION=false

# Layer-specific flags (only if master is true)
ENABLE_SEMANTIC_LAYER=true
ENABLE_ML_LAYER=true
ENABLE_GEMINI_LAYER=true
ENABLE_IMAGE_LAYER=true

# API Keys (required for respective layers)
HF_API_KEY=                    # HuggingFace (for embeddings)
GEMINI_API_KEY=                # Google Gemini (for validation)
```

### Enabling Enhanced Classification

```bash
# In .env file:
USE_ENHANCED_CLASSIFICATION=true

# Start backend
PORT=8000 npm start
```

**Without changing any code, the system will:**
1. Execute the original rule-based pipeline (unchanged)
2. Generate semantic embeddings in parallel
3. Run ML classifier on the embeddings
4. Merge both results through hybrid decision engine
5. Optionally validate via Gemini API
6. Process and validate images (if provided)
7. Return enhanced result with all confidence breakdowns

---

## Enhancement Layers

### Layer 1: Rule-Based Pipeline (PRESERVED)

**Status:** ✅ Unchanged | **Required:** Yes | **Modified:** No

Original implementation in `nlpService.js` executes fully:
- Text preprocessing and tokenization
- 14 civic complaint categories
- Priority scoring (critical → high → medium → low)
- Sentiment analysis
- TF-IDF keyword extraction
- Sub-category detection
- SLA hour calculation
- Department routing

**Output:**
```javascript
{
  category: "roads",
  confidence: 0.85,
  priority: "high",
  sentiment: "negative",
  keywords: ["pothole", "road", "damage"],
  subCategory: "pothole",
  slaHours: 24,
  deptCode: "PWD",
  deptName: "Public Works Department"
}
```

---

### Layer 2: Semantic Embedding Layer

**File:** `semanticEmbeddingService.js`  
**Status:** ✅ New | **Required:** No | **Fallback:** Yes

Generates embeddings using **all-mpnet-base-v2** model for semantic understanding.

**Features:**
- 768-dimensional embeddings
- HuggingFace API integration (free tier)
- Deterministic fallback (simple hash-based embedding)
- 24-hour caching
- Cosine similarity matching

**How it works:**
```javascript
const textEmbedding = await semanticEmbedding.generateEmbedding(
  "Pothole on Main Street near bridge - very dangerous"
);
// Returns: [0.12, 0.45, -0.23, ..., 0.67] (768 values)
```

---

### Layer 3: ML Classifier Layer

**File:** `mlClassifierService.js`  
**Status:** ✅ New | **Required:** No | **Fallback:** Yes

Lightweight ML classifier using embeddings.

**Methods:**
1. **K-NN Classification:** Find most similar category embedding
2. **Bayesian Classification:** Keyword probability-based
3. **Ensemble:** Combines both approaches
4. **Anomaly Detection:** Identifies unusual classifications

**Output:**
```javascript
{
  labels: ["roads", "infrastructure"],      // Multiple possible labels
  confidence: 0.82,
  scores: {                                  // Similarity scores per category
    roads: 0.82,
    infrastructure: 0.71,
    water_supply: 0.12,
    // ... other 11 categories
  },
  primary: "roads",
  secondary: "infrastructure"
}
```

---

### Layer 4: Hybrid Decision Engine

**File:** `hybridDecisionEngine.js`  
**Status:** ✅ New | **Required:** No | **Logic:** Smart merging

Combines rule-based and ML results intelligently.

**Decision Logic:**

| Rule-Based | ML-Based | Decision |
|-----------|----------|----------|
| roads (0.9) | roads (0.95) | **Agreement** → Boost confidence to 0.99 |
| roads (0.9) | water (0.85) | **Conflict** → Choose higher (roads 0.72) |
| roads (0.9) | roads (0.4) | **Low confidence** → Keep rule-based (0.72) |
| N/A | roads (0.75) | **ML only** → Use ML if confident |

**Severity Calibration:**
- If emotional words > threshold but no emergency keywords → cap priority at MEDIUM
- If emergency keywords detected → ensure at least HIGH priority

**Multi-Label Support:**
- Allow multiple categories if both sources vote for them
- Only if confidence is high (> 0.65)

**Output:**
```javascript
{
  finalCategory: "roads",
  finalConfidence: 0.89,
  allLabels: ["roads", "infrastructure"],
  requiresManualReview: false,
  conflictDetected: false,
  multiLabel: true
}
```

---

### Layer 5: Gemini API Validation Layer

**File:** `geminiValidationService.js`  
**Status:** ✅ New | **Required:** No | **Fallback:** Graceful

Uses Google's Gemini Pro model for LLM-based verification.

**Features:**
- Text validation of classification
- Priority verification
- Optional category refinement
- Vision API for image analysis
- 12-hour caching
- Works on free tier (with rate limits)

**Prompt sent to Gemini:**
```
Analyze this civic complaint:
"Pothole on Main Street near bridge - very dangerous"

Predicted category: roads (Confidence: 0.9)
Predicted priority: high

Is the classification correct?
Should priority be adjusted?
```

**Output:**
```javascript
{
  category_correct: true,
  category_confidence: 0.95,
  priority_correct: true,
  priority_confidence: 0.88,
  should_override: false,
  reasoning: "Classification is accurate",
  source: "gemini",
  adjusted: false
}
```

**Override Logic:**
- If `should_override = true` AND `category_confidence > 0.75` → Use Gemini's suggestion
- Otherwise → Keep hybrid engine result
- If Gemini API fails → Gracefully fallback to hybrid result

---

### Layer 6: Image Processing & Validation

**File:** `imageProcessingService.js`  
**Status:** ✅ New | **Required:** No | **Fallback:** Graceful

Validates complaint images against predicted category.

**Step 1: Local Analysis**
- Image format detection (JPEG, PNG, WebP)
- File size heuristics
- Color space estimation
- Basic feature extraction

**Step 2: Gemini Vision Validation** (if enabled)
- Send image to Gemini Vision API
- Ask: "Does this image match [category]?"
- Detect objects in image

**Output per image:**
```javascript
{
  match: "match" | "mismatch" | "uncertain",
  confidence: 0.85,
  detectedLabels: ["pothole", "asphalt", "road"],
  requiresReview: false
}
```

**Mismatch Handling:**
- If mismatch detected → Flag `requires_review = true`
- Complaint routed to officer review queue with image flag
- System logs why review needed

---

## Response Format

When `USE_ENHANCED_CLASSIFICATION=true`, the API returns:

```javascript
{
  // Core classification results
  final_category: "roads",
  all_labels: ["roads", "infrastructure"],
  priority: "high",
  sentiment: "negative",
  keywords: ["pothole", "road", "dangerous"],
  sub_category: "pothole",
  sla_hours: 24,
  department: "Public Works Department",
  department_code: "PWD",

  // Confidence breakdown
  confidence: 0.89,                          // Final weighted confidence
  confidence_breakdown: {
    rule_based: 0.85,                       // Original NLP confidence
    ml_based: 0.91,                         // ML classifier confidence
    gemini: 0.95,                           // Gemini validation confidence
    hybrid: 0.89                            // After merging
  },

  // Assessment flags
  requires_review: false,                    // Needs human review?
  gemini_adjusted: false,                    // Did Gemini override?
  multi_label: true,                        // Multiple categories?
  conflict_detected: false,                 // Rule vs ML conflict?
  severity_calibrated: false,               // Was priority adjusted?

  // Processing metadata
  processing_time_ms: 245,
  enhancements_applied: {
    semantic: true,                         // Which layers were used
    ml: true,
    gemini: true,
    image: true
  },

  // Internal details (optional)
  internal: {
    rule_based: {...},
    semantic_embedding: {...},
    ml_based: {...},
    hybrid_decision: {...},
    gemini_result: {...},
    image_validation: [...]
  }
}
```

When `USE_ENHANCED_CLASSIFICATION=false` (default), returns original format for backward compatibility.

---

## Usage

### Preview Classification (with enhancement)

```bash
curl -X POST http://localhost:8000/api/complaints/preview-classification \
  -H "Content-Type: application/json" \
  -d '{"text": "Pothole near bridge on Main Street"}'
```

**Response:**
```json
{
  "category": "roads",
  "confidence": 0.89,
  "priority": "high",
  "all_labels": ["roads", "infrastructure"],
  "enhancements_applied": {
    "semantic": true,
    "ml": true,
    "gemini": true
  }
}
```

### File Complaint (with enhancement)

```javascript
const response = await api.post('/complaints/file', {
  title: "Pothole on Main Street",
  description: "Dangerous pothole near bridge, 3 feet wide",
  latitude: 28.7041,
  longitude: 77.1025,
  images: [imageBuffer]  // Optional - will be validated
});
```

**Database stores:**
```javascript
{
  category: "roads",
  priority: "high",
  enhanced_metadata: {
    all_labels: [...],
    requires_review: false,
    confidence_breakdown: {...},
    processing_time_ms: 245
  },
  requires_review: false  // Flag for officer dashboard
}
```

---

## Performance Considerations

| Layer | Latency | Caching | Fallback |
|-------|---------|---------|----------|
| Rule-based | ~10ms | N/A | N/A |
| Semantic | 100-500ms | 24h | Hash-based |
| ML | 5-20ms | N/A | Simple rule |
| Hybrid | <5ms | N/A | Auto |
| Gemini | 500-2000ms | 12h | Graceful |
| Image | 200-500ms | N/A | Local only |

**Total enhanced latency:** ~1-2 seconds (with all layers enabled)  
**Optimization:** Run layers in parallel, cache aggressive

---

## Development & Testing

### Enable Enhanced Classification Locally

```bash
# In backend/.env
USE_ENHANCED_CLASSIFICATION=true
ENABLE_SEMANTIC_LAYER=true
ENABLE_ML_LAYER=true
ENABLE_GEMINI_LAYER=false  # Disable Gemini for testing
ENABLE_IMAGE_LAYER=false   # Disable images for testing

# Start backend
PORT=8000 npm start
```

### Test Endpoints

```bash
# Test preview with enhancement
curl -X POST http://localhost:8000/api/complaints/preview-classification \
  -H "Content-Type: application/json" \
  -d '{"text": "Garbage pile in street"}'

# Test file complaint
curl -X POST http://localhost:8000/api/complaints/file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Garbage issue",
    "description": "Street is full of garbage for 3 days",
    "latitude": 28.7,
    "longitude": 77.1
  }'
```

### Check Statistics

```javascript
// In backend node shell:
const orchestrator = require('./src/services/enhancedClassificationOrchestrator');
console.log(orchestrator.getStats());

// Output:
{
  totalProcessed: 42,
  successful: 40,
  failed: 2,
  successRate: "95.24%",
  conflictsDetected: 3,
  avgProcessingTimeMs: "856",
  enhancements: {
    semantic: true,
    ml: true,
    gemini: false,
    image: false
  }
}
```

---

## Troubleshooting

### Semantic embedding fails silently
- **Cause:** HF_API_KEY not set or invalid
- **Status:** Uses fallback hash-based embedding
- **Fix:** Set valid HuggingFace token or leave blank to use fallback

### Gemini validation not working
- **Cause:** GEMINI_API_KEY not set
- **Status:** Classification continues bypassing Gemini layer
- **Fix:** Set API key or set `ENABLE_GEMINI_LAYER=false`

### Classification slower than expected
- **Cause:** All layers enabled, Gemini API slow
- **Solution:** Disable less critical layers or set config for parallel execution

### High "requires_review" flag rate
- **Cause:** Conflict detection too aggressive
- **Status:** Check `hybridDecisionEngine.conflictThreshold` value
- **Solution:** Adjust threshold or review classification tuning

---

## Disabling Enhancements

To revert to original pipeline without code changes:

```bash
# In .env
USE_ENHANCED_CLASSIFICATION=false

# System will:
# 1. Skip all enhancement layers
# 2. Use only original rule-based NLP
# 3. Return original response format
# 4. Zero additional latency
```

---

## Future Enhancements

- [ ] Cloud-based embedding service (AWS SageMaker)
- [ ] Custom fine-tuned ML models per category
- [ ] Real-time feedback loop for model improvement
- [ ] Multi-language support for embeddings
- [ ] Real-time image processing with OpenCV
- [ ] A/B testing framework for classification methods
- [ ] Admin dashboard for monitoring enhancements

---

## Support & Monitoring

**Check enhanced pipeline health:**
```javascript
// Hybrid engine status
const hedge = require('./services/hybridDecisionEngine');
console.log(hedge.getStats());

// ML classifier status
const mlc = require('./services/mlClassifierService');
console.log(mlc.getStats());

// Gemini validation status
const gemini = require('./services/geminiValidationService');
gemini.healthCheck().then(console.log);

// Image processing status
const img = require('./services/imageProcessingService');
console.log(img.getStats());
```

---

**Last Updated:** March 21, 2026  
**Version:** 1.0  
**Status:** Production Ready
