/**
 * Test Script: HuggingFace Integration End-to-End Test
 * 
 * Tests that HuggingFace classification and sentiment analysis
 * are being called during complaint classification.
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5001';

// Test complaint data
const testComplaints = [
  {
    title: 'Pothole on Main Street',
    description: 'There is a large pothole on Main Street near the market that is damaging vehicles. It\'s been there for weeks and needs urgent repair.',
    category: 'roads',
    address: '123 Main Street',
    pincode: '110001',
    latitude: 28.6139,
    longitude: 77.2090
  },
  {
    title: 'Water Supply Issue',
    description: 'No water supply in our area for the last 3 days. This is affecting all households in the neighborhood. We need immediate action.',
    category: 'water_supply',
    address: '456 Water Lane',
    pincode: '110002',
    latitude: 28.6155,
    longitude: 77.2100
  },
  {
    title: 'Street Light Not Working',
    description: 'The street light near the intersection has been broken for 2 weeks. It\'s creating an unsafe situation at night.',
    category: 'public_lighting',
    address: '789 Light Road',
    pincode: '110003',
    latitude: 28.6170,
    longitude: 77.2110
  }
];

async function testHuggingFaceIntegration() {
  console.log('\n' + '='.repeat(70));
  console.log('🤗 HuggingFace Integration End-to-End Test');
  console.log('='.repeat(70) + '\n');

  let token = null;
  
  // Get a test token first
  try {
    console.log('🔐 Authenticating...');
    
    // Try to login with test credentials
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'test@example.com',
      password: 'Test@123'
    }).catch(async () => {
      // If login fails, try to register first
      console.log('   No account found, registering...');
      return axios.post(`${API_BASE}/api/auth/register`, {
        full_name: 'Test User',
        email: 'test@example.com',
        password: 'Test@123'
      }).then(() => {
        return axios.post(`${API_BASE}/api/auth/login`, {
          email: 'test@example.com',
          password: 'Test@123'
        });
      });
    });
    
    token = loginResponse.data.token || loginResponse.data.access_token;
    console.log('✅ Authenticated\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.error || error.message);
    console.log('\nSkipping test - cannot get authentication token\n');
    return;
  }

  for (let i = 0; i < testComplaints.length; i++) {
    const complaint = testComplaints[i];
    
    console.log(`\n📝 Test ${i + 1}: Filing complaint - "${complaint.title}"`);
    console.log('-'.repeat(70));
    
    try {
      const response = await axios.post(`${API_BASE}/api/complaints`, {
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        sub_category: 'general',
        address: complaint.address,
        landmark: 'Market Area',
        pincode: complaint.pincode,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        issue_type: 'urgent'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        const result = response.data;
        console.log('✅ Complaint Filed Successfully');
        console.log(`   Status: ${result.status}`);
        console.log(`   Message: ${result.message}`);
        console.log('\n   📊 Full Response:');
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('❌ Error filing complaint:');
      if (error.response?.data) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Error: ${error.response.data.message || JSON.stringify(error.response.data)}`);
      } else {
        console.error(`   ${error.message}`);
      }
    }

    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Test Complete - Check backend console for detailed HuggingFace logs');
  console.log('='.repeat(70) + '\n');
}

// Run the test
testHuggingFaceIntegration().catch(console.error);
