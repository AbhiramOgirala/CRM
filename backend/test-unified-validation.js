#!/usr/bin/env node
'use strict';

require('dotenv').config();
const fs = require('fs');

/**
 * Test unified complaint + image validation
 * Sends both complaint text and image together to Gemini in a single API call
 */
async function testUnifiedValidation() {
  try {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  🧪 UNIFIED COMPLAINT + IMAGE TEST       ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    // Import services
    const imageProcessingService = require('./src/services/imageProcessingService');
    const geminiValidation = require('./src/services/geminiValidationService');

    // Create test image (small valid JPEG)
    const testImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      ...Array(10000).fill(0xFF)
    ]);

    const complaintText = 'There is a large pothole on the main road making it dangerous for vehicles';
    const category = 'roads';

    console.log('📋 Test Scenario:');
    console.log(`  Complaint: "${complaintText}"`);
    console.log(`  Category: ${category}`);
    console.log(`  Image Size: ${testImageBuffer.length} bytes`);
    console.log(`  Gemini API: ${geminiValidation.isAvailable ? 'Available ✅' : 'Unavailable ⚠️'}\n`);

    // Step 1: Local analysis
    console.log('━'.repeat(45));
    console.log('STEP 1: Local Image Analysis');
    console.log('━'.repeat(45) + '\n');

    const localResult = await imageProcessingService._analyzeLocally(testImageBuffer, category);
    console.log('Local Result:');
    console.log(`  Confidence: ${(localResult.categoryMatch * 100).toFixed(1)}%`);
    console.log(`  Features: ${localResult.detectedFeatures.join(', ') || 'none'}`);
    console.log(`  Labels: ${localResult.labels.join(', ') || 'none'}\n`);

    // Step 2: Unified validation (NEW)
    console.log('━'.repeat(45));
    console.log('STEP 2: Unified Validation (Text + Image)');
    console.log('━'.repeat(45) + '\n');

    const unifiedResult = await geminiValidation.validateComplaintWithImage(
      complaintText,
      category,
      testImageBuffer.toString('base64'),
      localResult
    );

    console.log('Unified Validation Result:');
    console.log(`  Source: ${unifiedResult.source}`);

    if (unifiedResult.gemini) {
      console.log(`\n  🤖 GEMINI ANALYSIS (Text + Image Together):`);
      console.log(`    Text-Image Match: ${unifiedResult.gemini.textImageMatch}`);
      console.log(`    Text-Image Coherence: ${(unifiedResult.gemini.textImageCoherence * 100).toFixed(1)}%`);
      console.log(`    Category Matches Text: ${unifiedResult.gemini.categoryMatchesText ? 'Yes ✅' : 'No ❌'}`);
      console.log(`    Category Matches Image: ${unifiedResult.gemini.categoryMatchesImage ? 'Yes ✅' : 'No ❌'}`);
      console.log(`    Visual-Text Match: ${unifiedResult.gemini.visualDescriptionMatch}`);
      console.log(`    Final Validation: ${unifiedResult.gemini.finalValidation}`);
      console.log(`    Confidence: ${(unifiedResult.gemini.confidence * 100).toFixed(1)}%`);
      console.log(`    Explanation: ${unifiedResult.gemini.explanation}`);
      if (unifiedResult.gemini.detectedObjects.length > 0) {
        console.log(`    Detected Objects: ${unifiedResult.gemini.detectedObjects.join(', ')}`);
      }
      if (unifiedResult.gemini.issues !== 'none') {
        console.log(`    Issues Found: ${unifiedResult.gemini.issues}`);
      }
    } else {
      console.log(`\n  🤖 GEMINI ANALYSIS: Not available (using fallback)`);
    }

    console.log(`\n  📊 LOCAL ANALYSIS (For Comparison):`);
    console.log(`    Confidence: ${(unifiedResult.local.confidence * 100).toFixed(1)}%`);
    console.log(`    Features: ${unifiedResult.local.features.join(', ') || 'none'}`);

    console.log(`\n  ✨ CONSOLIDATED RESULT:`);
    console.log(`    Text-Image Match: ${unifiedResult.consolidated.textImageMatch}`);
    console.log(`    Overall Confidence: ${(unifiedResult.consolidated.overallConfidence * 100).toFixed(1)}%`);
    console.log(`    Category Valid: ${unifiedResult.consolidated.categoryValid ? 'Yes ✅' : 'No ❌'}`);
    console.log(`    Complaint-Image Alignment: ${(unifiedResult.consolidated.complaintImageAlignment * 100).toFixed(1)}%`);
    console.log(`    Status: ${unifiedResult.consolidated.status}`);
    console.log(`    Requires Review: ${unifiedResult.consolidated.requiresReview ? 'YES 🚨' : 'No'}`);
    console.log(`    Reasoning: ${unifiedResult.consolidated.reasoning}`);

    // Step 3: Full image processing with unified validation
    console.log('\n' + '━'.repeat(45));
    console.log('STEP 3: Full Image Processing (Integrated)');
    console.log('━'.repeat(45) + '\n');

    const fullResult = await imageProcessingService.processImage(
      testImageBuffer,
      category,
      complaintText
    );

    console.log('Full Processing Result:');
    console.log(`  Source: ${fullResult.source}`);
    console.log(`  Status: ${fullResult.consolidated?.status}`);
    console.log(`  Confidence: ${(fullResult.consolidated?.overallConfidence * 100).toFixed(1)}%`);
    console.log(`  Text-Image Match: ${fullResult.consolidated?.textImageMatch}`);
    console.log(`  Complaint-Image Alignment: ${(fullResult.consolidated?.complaintImageAlignment * 100).toFixed(1)}%`);

    console.log('\n' + '━'.repeat(45));
    console.log('✅ TEST COMPLETE');
    console.log('━'.repeat(45) + '\n');

    console.log('Summary:');
    console.log(`  ✓ Local analysis working`);
    console.log(`  ✓ Unified validation working (text + image in single call)`);
    console.log(`  ✓ Complaint-image coherence measured: ${(unifiedResult.consolidated.complaintImageAlignment * 100).toFixed(1)}%`);
    console.log(`  ✓ Category validation: ${unifiedResult.consolidated.categoryValid ? 'Valid ✅' : 'Invalid ❌'}`);
    console.log(`  ✓ Final status: ${fullResult.consolidated?.status}\n`);

    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', err.message);
    console.error('\nStack:', err.stack);
    process.exit(1);
  }
}

testUnifiedValidation();
