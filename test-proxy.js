// test-proxy.js
const http = require('http');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const API_KEY = process.env.API_KEY || 'your-secret-api-key-here';
const PORT = process.env.PORT || 3000;

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = responseBody ? JSON.parse(responseBody) : {};
        } catch (e) {
          parsedBody = { raw: responseBody };
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsedBody
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Test health check endpoint
async function testHealthCheck() {
  try {
    console.log('\n📋 Testing health check endpoint...');
    
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    };
    
    const response = await makeRequest(options);
    
    console.log('✅ Health check successful:');
    console.log(`  Status: ${response.statusCode}`);
    console.log(`  Response: ${JSON.stringify(response.body)}`);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

// Test Ollama list models endpoint
async function testOllamaListModels() {
  try {
    console.log('\n📋 Testing Ollama list models endpoint...');
    
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/tags',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    };
    
    const response = await makeRequest(options);
    
    console.log('✅ List models request successful!');
    console.log(`  Status: ${response.statusCode}`);
    console.log(`  Models available: ${JSON.stringify(response.body)}`);
    return true;
  } catch (error) {
    console.error('❌ List models request failed:', error.message);
    return false;
  }
}

// Test Ollama generate endpoint
async function testOllamaGenerate() {
  try {
    console.log('\n📋 Testing Ollama generate endpoint...');
    console.log('Sending request to: ' + `http://localhost:${PORT}/api/generate`);
    console.log('Using API key:', API_KEY);
    
    const requestData = JSON.stringify({
      model: "llama2",
      prompt: "Hello, how are you?",
      stream: false
    });
    
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    const response = await makeRequest(options, requestData);
    
    console.log('✅ Generate request successful!');
    console.log(`  Status: ${response.statusCode}`);
    console.log(`  Response data: ${JSON.stringify(response.body)}`);
    return true;
  } catch (error) {
    console.error('❌ Generate request failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🔍 Testing Ollama proxy...');
  
  const healthCheckResult = await testHealthCheck();
  const modelsResult = await testOllamaListModels();
  const generateResult = await testOllamaGenerate();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`Health Check: ${healthCheckResult ? '✅ Passed' : '❌ Failed'}`);
  console.log(`List Models: ${modelsResult ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Generate: ${generateResult ? '✅ Passed' : '❌ Failed'}`);
  
  if (healthCheckResult && modelsResult && generateResult) {
    console.log('\n🎉 All tests passed! Your Ollama proxy is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above for details.');
  }
}

// Run the tests
runTests();