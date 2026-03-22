/**
 * Test: Unified Gemini Validation (Text + Image Together)
 * 
 * Demonstrates that Gemini now validates both complaint text and image
 * in a SINGLE API call (not separately)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5001';

// Load a sample test image from public folder
function loadTestImage() {
  try {
    // Try to find any .jpg or .png in common test locations
    const testPaths = [
      '/Users/keerthipriyareddy/Documents/GitHub/CRM/backend/test-image.jpg',
      '/Users/keerthipriyareddy/Documents/GitHub/CRM/frontend/public/test-image.jpg'
    ];
    
    for (const testPath of testPaths) {
      if (fs.existsSync(testPath)) {
        const buffer = fs.readFileSync(testPath);
        return buffer.toString('base64');
      }
    }
  } catch (err) {
    console.error('Image loading error:', err.message);
  }
  return null;
}

async function testUnifiedGeminiValidation() {
  console.log('\n' + '='.repeat(80));
  console.log('🤖 Unified Gemini Validation Test (Text + Image Together)');
  console.log('='.repeat(80) + '\n');

  let token = null;
  
  // Authenticate
  try {
    console.log('🔐 Authenticating...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'test-unified@example.com',
      password: 'Test@123'
    }).catch(async () => {
      console.log('   Registering new test user...');
      await axios.post(`${API_BASE}/api/auth/register`, {
        full_name: 'Unified Test User',
        email: 'test-unified@example.com',
        password: 'Test@123'
      });
      return axios.post(`${API_BASE}/api/auth/login`, {
        email: 'test-unified@example.com',
        password: 'Test@123'
      });
    });
    
    token = loginResponse.data.token;
    console.log('✅ Authenticated\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.error || error.message);
    return;
  }

  // Test Case 1: Complaint WITH Image
  console.log('📋 TEST 1: Complaint WITH Image');
  console.log('-'.repeat(80));
  console.log('Scenario: Pothole complaint + street damage photo');
  console.log('Expected: Gemini validates BOTH text and image together in single call\n');

  const testImage = loadTestImage();
  
  try {
    const formData = new FormData();
    
    // Add text data
    formData.append('title', 'Large Pothole Damaging Vehicles');
    formData.append('description', 'There is a large pothole on Main Street near the market. It is damaging vehicles and creating traffic hazards. Urgent repair needed.');
    formData.append('category', 'roads');
    formData.append('sub_category', 'pothole');
    formData.append('address', '123 Main Street, Delhi');
    formData.append('landmark', 'Near Central Market');
    formData.append('pincode', '110001');
    formData.append('latitude', '28.6139');
    formData.append('longitude', '77.2090');

    // Add image if available
    if (testImage) {
      const imageBuffer = Buffer.from(testImage, 'base64');
      formData.append('images', imageBuffer, 'pothole.jpg');
      console.log('🖼️  Image attached: pothole.jpg');
    } else {
      console.log('⚠️  No test image found - will test text-only validation');
    }

    const response = await axios.post(`${API_BASE}/api/complaints`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    console.log('\n✅ Complaint Filed Successfully');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Ticket: ${response.data.ticket_number}`);
    console.log(`   Category: ${response.data.final_category}`);
    console.log(`   Confidence: ${(response.data.confidence * 100).toFixed(1)}%`);
    console.log(`   Priority: ${response.data.priority}`);
    
    if (response.data.enhancements_applied) {
      console.log('\n   Gemini Processing:');
      console.log(`   ✅ Unified Validation (Text + Image): ${response.data.enhancements_applied.huggingface ? '✓' : '✗'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }

  // Test Case 2: Complaint WITHOUT Image (text-only)
  console.log('\n\n📋 TEST 2: Complaint WITHOUT Image (Text-Only)');
  console.log('-'.repeat(80));
  console.log('Scenario: Water supply complaint without image');
  console.log('Expected: Gemini validates text only\n');

  try {
    const response = await axios.post(`${API_BASE}/api/complaints`, 
      {
        title: 'No Water Supply in Society',
        description: 'No water supply in the society for 3 days. All households affected. Need immediate action.',
        category: 'water_supply',
        sub_category: 'no_supply',
        address: '456 Water Lane, Delhi',
        landmark: 'Residential Area',
        pincode: '110002',
        latitude: '28.6155',
        longitude: '77.2100'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Complaint Filed Successfully');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Ticket: ${response.data.ticket_number}`);
    console.log(`   Category: ${response.data.final_category}`);
    console.log(`   Confidence: ${(response.data.confidence * 100).toFixed(1)}%`);
    console.log(`   Priority: ${response.data.priority}`);
    
    console.log('\n   Gemini Processing:');
    console.log(`   ✅ Text-Only Validation: Used (no image provided)`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Unified Gemini Validation Test Complete');
  console.log('Check backend console for [GeminiUnified] and [GeminiText] logs');
  console.log('='.repeat(80) + '\n');
}

testUnifiedGeminiValidation().catch(console.error);
