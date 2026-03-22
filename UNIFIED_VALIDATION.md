# Unified Complaint + Image Validation

## Overview

The system now validates **complaint text and image together** in a single Gemini API call, checking:

1. **Text-Image Coherence**: Does the image match what the complaint describes?
2. **Category Validation**: Is the category appropriate for BOTH text AND image?
3. **Quality Assessment**: Are there any contradictions or concerns?

---

## Architecture Flow

```
┌─────────────────────┐
│ Complaint + Image   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ UNIFIED VALIDATION PIPELINE         │
└──────────┬──────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌──────────────────────────────────┐
│ LOCAL   │ │ GEMINI (Single API Call)         │
│ ANALYSIS│ │ - Complaint text + image together│
│         │ │ - Measures text-image coherence  │
│ 70ms    │ │ - Validates category against both│
│         │ │ - Returns comprehensive analysis │
└────┬────┘ │ - 1-3 seconds                    │
     │      └──────────────┬───────────────────┘
     │                     │
     └─────────┬───────────┘
               │
               ▼
        ┌───────────────────┐
        │ CONSOLIDATED      │
        │ RESULT            │
        │                   │
        │ Status:VERIFIED   │
        │ Coherence: 85%    │
        │ Confidence: 78%   │
        └───────────────────┘
```

---

## API Request

### Image Analysis Endpoint
```
POST /api/image/analyze
Content-Type: multipart/form-data

Parameters:
- image: File (required)
- category: String (required)  
- description: String (optional - complaint text)

Example:
  image = [JPEG file]
  category = "roads"
  description = "Large pothole on main road making it dangerous"
```

### Complaint Filing Endpoint
```
POST /api/complaints
Content-Type: multipart/form-data

Parameters:
- title: String (required)
- description: String (required)
- images: Array<File> (optional)
- category: String (optional - auto-classified)

The endpoint automatically validates text + images together
```

---

## API Response Structure

### Unified Validation Result

```json
{
  "local_analysis": {
    "confidence": 70.0,
    "detected_features": ["format_jpeg"],
    "detected_labels": ["pothole", "pavement", "asphalt"]
  },
  
  "gemini_analysis": {
    "text_image_match": "match",
    "text_image_coherence": 85.5,
    "category_matches_text": true,
    "category_matches_image": true,
    "visual_description_match": "match",
    "detected_objects": ["pothole", "damaged_road", "debris"],
    "issues": "none",
    "final_validation": "valid",
    "confidence": 88.5,
    "explanation": "Image clearly shows a pothole matching the complaint description"
  },
  
  "image_analysis": {
    "text_image_match": "match",
    "complaint_image_alignment": 85.5,
    "category_valid": true,
    "confidence": 79.25,
    "requires_review": false,
    "reasoning": "Text-Image Coherence: 85.5% | Category Valid: Yes | Validation: valid"
  },
  
  "classification": {
    "category": "roads",
    "department": "PWD",
    "priority": "HIGH",
    "image_confidence": 79.25,
    "department_confidence": 85.0,
    "final_confidence": 82.13
  },
  
  "status": "VERIFIED"
}
```

---

## Key Components

### 1. Text-Image Coherence Measurement
Gemini validates if the image content matches the complaint description:
- ✅ **Match** (> 0.8): Image clearly shows what was described
- ⚠️ **Uncertain** (0.4-0.8): Partial match or ambiguous
- ❌ **Mismatch** (< 0.4): Image doesn't match description

### 2. Category Validation
Two independent checks:
- **Category Matches Text**: Is category appropriate for complaint description?
- **Category Matches Image**: Is category appropriate for visual content?

Both must be true for `category_valid = true`

### 3. Complaint Description Issues
Detected concerns:
- `"none"` - No issues found
- `"description doesn't match image"` - Text and image inconsistent
- `"possibly fraudulent"` - Suspicious patterns detected
- `"ambiguous"` - Can't determine if legitimate

### 4. Final Validation Status
- **"valid"** - High confidence, text + image align, category appropriate
- **"suspicious"** - Potential fraud or misrepresentation detected
- **"ambiguous"** - Cannot confidently validate

---

## Response Status Values

| Status | Meaning | When Triggered |
|--------|---------|---|
| **VERIFIED** | Complaint + image fully aligned | Coherence > 80% + valid category + valid status |
| **MISMATCH** | Complaint + image don't match | Coherence < 40% OR suspicious validation |
| **UNCERTAIN** | Ambiguous or concerning alignment | 40% ≤ Coherence ≤ 80% OR ambiguous validation |

---

## Unified API Call Example

### What Gets Sent to Gemini

```
You are an expert civic complaint analyst. Your task is to validate 
if a complaint text and image are coherent and correctly categorized.

COMPLAINT DETAILS:
- Text: "There is a large pothole on the main road making it dangerous"
- Category: roads

LOCAL IMAGE ANALYSIS (for reference):
- Confidence: 70.0%
- Detected Features: format_jpeg

Please analyze both complaint text and provided image together...
```

**Single API call processes:**
1. Complaint text
2. Image simultaneously
3. Returns coherence score
4. Validates category against both sources
5. Detects issues or contradictions

---

## Benefits

✅ **Single API Call**: Text + image validated together (not separate calls)
✅ **Coherence Measurement**: Quantifies text-image alignment (0-100%)
✅ **Fraud Detection**: Identifies suspicious text-image mismatches
✅ **Category Validation**: Ensures category fits both text AND image
✅ **Transparent Results**: Shows how text/image/category relate
✅ **Fallback Safety**: Local analysis available if Gemini unavailable
✅ **Cost Efficient**: One Gemini call instead of two

---

## Console Output Example

```
✅ [COMPLAINT + IMAGE VALIDATION]
   Category: ROADS
   Department: PWD
   Priority: HIGH

   📊 LOCAL IMAGE ANALYSIS:
      Confidence: 70.0%
      Features: format_jpeg

   🤖 UNIFIED GEMINI VALIDATION (Text + Image):
      Text-Image Match: match
      Complaint-Image Coherence: 85.5%
      Category Matches Text: Yes
      Category Matches Image: Yes
      Validation: valid
      Gemini Confidence: 88.5%
      Detected Objects: pothole, damaged_road, debris

   ✨ FINAL VERDICT:
      Status: VERIFIED
      Complaint-Image Alignment: 85.5%
      Category Valid: Yes
      Final Confidence: 79.25%
      Requires Review: No
```

---

## Error Handling & Fallbacks

### When Gemini Unavailable
```json
{
  "local_analysis": { ... },
  "gemini_analysis": null,
  "image_analysis": {
    "text_image_match": "uncertain",
    "complaint_image_alignment": 70.0,
    "confidence": 70.0,
    "requires_review": false,
    "reasoning": "Using local analysis only (Gemini unavailable)"
  },
  "status": "UNCERTAIN"
}
```

### When Image Invalid
- Gemini returns 400 error with graceful fallback
- System uses local analysis confidence
- Complaint still processable but marked for review

---

## Testing

Run the unified validation test:
```bash
node backend/test-unified-validation.js
```

Expected output:
- ✓ Local analysis working
- ✓ Unified validation working (text + image in single call)
- ✓ Complaint-image coherence measured
- ✓ Category validation results
- ✓ Final status determination

---

## Configuration

### Environment Variables
```env
# Enable/disable features
USE_ENHANCED_CLASSIFICATION=true
ENABLE_IMAGE_LAYER=true
GEMINI_API_KEY=AIzaSy...
```

### Adjust Thresholds (if needed)
In `geminiValidationService.js`:
```javascript
// Coherence thresholds
if (geminiResult.text_image_coherence > 0.8)  // > 80% = VERIFIED
if (geminiResult.text_image_coherence > 0.4)  // > 40% = UNCERTAIN
// else = MISMATCH
```

---

## Next Steps

1. **Monitor Real Data**: Track coherence scores across actual complaints
2. **Fraud Analysis**: Identify patterns in low-coherence flagged complaints
3. **Tune Weights**: Adjust confidence weighting based on real results
4. **Expand Categories**: Add more pattern detection for other complaint types
5. **Cache Intelligence**: Cache high-confidence validations for faster reprocessing

---

## FAQ

**Q: Why single API call instead of two?**
A: More efficient, validates consistency between text and image, catches mismatches better, single source of truth for coherence score.

**Q: What if text and image disagree?**
A: System marks as MISMATCH or UNCERTAIN depending on severity, flags for manual review if coherence < 60%.

**Q: How accurate is text-image coherence?**
A: Measured 0-100% by Gemini. Trust scores > 80%, review scores 40-80%, reject scores < 40%.

**Q: Works without Gemini?**
A: Yes - falls back to 70%+ local analysis confidence, marks as UNCERTAIN for review.

**Q: Can this detect fraud?**
A: Yes - if text describes roads issue but image shows water pipes, system detects mismatch and flags as suspicious.
