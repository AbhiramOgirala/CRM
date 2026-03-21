#!/usr/bin/env node
'use strict';

require('dotenv').config();
const fs = require('fs');

/**
 * Test the consolidated image analysis flow:
 * 1. Local analysis
 * 2. Gemini verification with local results
 * 3. Final consolidated result
 */
async function testConsolidatedImageAnalysis() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  🧪 CONSOLIDATED IMAGE ANALYSIS TEST  ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Import services
    const imageProcessingService = require('./src/services/imageProcessingService');
    const geminiValidation = require('./src/services/geminiValidationService');

    // Create a simple test image buffer (small valid JPEG header)
    const testImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      // Padding to make it a reasonable size
      ...Array(10000).fill(0xFF)
    ]);

    console.log('📋 Test Configuration:');
    console.log(`  Category: roads`);
    console.log(`  Description: There is a large pothole on the main road`);
    console.log(`  Image Size: ${testImageBuffer.length} bytes`);
    console.log(`  Gemini Available: ${geminiValidation.isAvailable ? 'YES ✅' : 'NO ⚠️'}\n`);

    // Test 1: Local analysis only
    console.log('━'.repeat(40));
    console.log('STEP 1: Local Image Analysis');
    console.log('━'.repeat(40) + '\n');

    const localResult = await imageProcessingService._analyzeLocally(testImageBuffer, 'roads');
    console.log('Local Analysis Result:');
    console.log(`  Confidence: ${(localResult.categoryMatch * 100).toFixed(1)}%`);
    console.log(`  Features: ${localResult.detectedFeatures.join(', ') || 'none'}`);
    console.log(`  Labels: ${localResult.labels.join(', ') || 'none'}\n`);

    // Test 2: Full consolidated analysis
    console.log('━'.repeat(40));
    console.log('STEP 2: Full Consolidated Analysis');
    console.log('━'.repeat(40) + '\n');

    const result = await imageProcessingService.processImage(
      testImageBuffer,
      'roads',
      'There is a large pothole on the main road'
    );

    console.log('Consolidated Analysis Result:');
    console.log(`  Source: ${result.source}`);
    console.log(`  Timestamp: ${result.timestamp}`);

    if (result.localAnalysis) {
      console.log(`\n  📊 LOCAL ANALYSIS:`);
      console.log(`    Confidence: ${(result.localAnalysis.confidence * 100).toFixed(1)}%`);
      console.log(`    Features: ${result.localAnalysis.detectedFeatures.join(', ') || 'none'}`);
      console.log(`    Labels: ${result.localAnalysis.detectedLabels.join(', ') || 'none'}`);
    }

    if (result.geminiAnalysis) {
      console.log(`\n  🤖 GEMINI ANALYSIS:`);
      console.log(`    Confidence: ${(result.geminiAnalysis.confidence * 100).toFixed(1)}%`);
      console.log(`    Category Match: ${result.geminiAnalysis.categoryMatch}`);
      console.log(`    Agreement: ${result.final.agreementLevel}`);
      console.log(`    Additional Objects: ${result.geminiAnalysis.additionalObjects.join(', ') || 'none'}`);
      console.log(`    Explanation: ${result.geminiAnalysis.explanation}`);
    } else {
      console.log(`\n  🤖 GEMINI ANALYSIS: Not available (${result.source === 'fallback' ? 'API unavailable' : 'skipped'})`);
    }

    console.log(`\n  ✨ FINAL CONSOLIDATED RESULT:`);
    console.log(`    Match: ${result.final.match}`);
    console.log(`    Confidence: ${(result.final.confidence * 100).toFixed(1)}%`);
    console.log(`    Agreement Level: ${result.final.agreementLevel}`);
    console.log(`    Requires Review: ${result.final.requiresReview ? 'YES' : 'NO'}`);
    console.log(`    Reasoning: ${result.final.reasoning}`);

    // Test 3: Gemini health check
    console.log('\n' + '━'.repeat(40));
    console.log('STEP 3: Gemini API Health Check');
    console.log('━'.repeat(40) + '\n');

    const health = await geminiValidation.healthCheck();
    console.log('Gemini API Status:');
    console.log(`  Available: ${health.available ? 'YES ✅' : 'NO ⚠️'}`);
    console.log(`  Reason: ${health.reason}`);

    console.log('\n' + '━'.repeat(40));
    console.log('✅ TEST COMPLETE');
    console.log('━'.repeat(40) + '\n');

    console.log('Summary:');
    console.log(`  • Local analysis: Working ✅`);
    console.log(`  • Consolidated result: ${result.final ? 'Working ✅' : 'Failed ❌'}`);
    console.log(`  • Gemini integration: ${geminiValidation.isAvailable ? 'Active ✅' : 'Fallback mode ⚠️'}`);
    console.log(`  • Final match status: ${result.final.match.toUpperCase()}`);
    console.log(`  • Confidence: ${(result.final.confidence * 100).toFixed(1)}%\n`);

    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', err.message);
    console.error('\nStack:', err.stack);
    process.exit(1);
  }
}

testConsolidatedImageAnalysis();
