# Gemini Model Update - Title Generation

## Change Summary
Updated the Gemini model used for complaint title generation from `gemini-3.1-flash-lite-preview` to `gemini-2.5-flash-lite`.

## Files Modified

### 1. `CRM/backend/src/services/geminiValidationService.js`
**Line 18**: Changed model configuration
```javascript
// Before
this.model = 'gemini-3.1-flash-lite-preview';

// After
this.model = 'gemini-2.5-flash-lite';
```

### 2. `CRM/backend/src/services/imageProcessingService.js`
**Line 269**: Updated source check for image analysis
```javascript
// Before
if (geminiResult && geminiResult.source === 'gemini-3.1-flash-lite-preview') {

// After
if (geminiResult && geminiResult.source === 'gemini-2.5-flash-lite') {
```

## Impact

### Title Generation
- When users file a complaint, the system uses Gemini to generate a concise title
- Now uses the `gemini-2.5-flash-lite` model instead of `gemini-3.1-flash-lite-preview`
- Fallback to NLP-based title generation remains unchanged if Gemini is unavailable

### Image Analysis
- Image processing service checks the Gemini source for validation
- Updated to recognize results from the new model

## Model Comparison

| Feature | gemini-3.1-flash-lite-preview | gemini-2.5-flash-lite |
|---------|------------------------------|----------------------|
| Speed | Fast | Faster |
| Cost | Lower | Lowest |
| Quality | Good | Good |
| Availability | Preview | Stable |

## Benefits of gemini-2.5-flash-lite

✅ **Stable Release**: Not a preview version, more reliable
✅ **Lower Cost**: More cost-effective for high-volume title generation
✅ **Faster Response**: Optimized for quick inference
✅ **Better Availability**: Stable model with better uptime

## Testing

### To Test Title Generation:
1. Start the backend server
2. File a new complaint with a description
3. The system should generate a title using Gemini 2.5 Flash Lite
4. Check backend logs for `[GeminiTitleGeneration]` messages
5. Verify the generated title is concise and relevant

### Expected Behavior:
- Title should be 4-10 words
- Plain sentence case, no emojis
- Clear and specific to the complaint
- Generated within 1-2 seconds

## Rollback

If needed, revert by changing back to:
```javascript
this.model = 'gemini-3.1-flash-lite-preview';
```

## Environment Variables

No changes needed to environment variables. The same `GEMINI_API_KEY` works with both models.

```env
GEMINI_API_KEY=your_api_key_here
```

## Notes

- The change is backward compatible
- Existing cached titles remain valid
- No database migration required
- No frontend changes needed
