#!/usr/bin/env node
'use strict';

require('dotenv').config();

// Test if the Gemini SDK works with the official package
async function testGeminiSDK() {
  try {
    console.log('\n=== Testing Google Generative AI SDK ===\n');
    
    // Import the SDK
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    console.log('✓ Successfully imported @google/generative-ai');
    
    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('⚠ No GEMINI_API_KEY in environment');
      console.log('  The Gemini service will work in fallback mode');
      return;
    }
    
    console.log('✓ GEMINI_API_KEY found');
    
    // Initialize client
    const client = new GoogleGenerativeAI(apiKey);
    console.log('✓ GoogleGenerativeAI client initialized');
    
    // Get model
    const model = client.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
    console.log('✓ Model instance created: gemini-3.1-flash-lite-preview');
    
    // Test simple prompt
    console.log('\nTesting with simple prompt...');
    const result = await model.generateContent('Respond with just "ok"');
    const response = result.response;
    const text = response.text();
    
    console.log('✓ API call successful!');
    console.log(`  Response: "${text.substring(0, 50)}..."`);
    
    console.log('\n=== Gemini SDK Test PASSED ===\n');
    
  } catch (err) {
    console.error('\n❌ Gemini SDK Test FAILED');
    console.error('Error:', err.message);
    console.error('\nThis could mean:');
    console.error('1. API key is invalid or missing');
    console.error('2. API key lacks permissions for Generative AI');
    console.error('3. Network/connectivity issue');
    console.error('\nThe system will work with local image analysis fallback.\n');
    process.exit(1);
  }
}

testGeminiSDK();
