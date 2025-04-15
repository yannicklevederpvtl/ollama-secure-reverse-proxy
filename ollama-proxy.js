// ollama-proxy.js
const express = require('express');
const http = require('http');
const https = require('https');
const url = require('url');
const dotenv = require('dotenv');
const app = express();

// Load environment variables
dotenv.config();

// Config
const API_KEY = process.env.API_KEY || 'your-secret-api-key-here';
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_URL_PARSED = url.parse(OLLAMA_URL);

// Use JSON parser with higher limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const reqUrl = req.url;
  
  console.log(`${timestamp} - ${method} ${reqUrl}`);
  
  // Additional detailed logging for POST requests
  if (method === 'POST') {
    const contentType = req.headers['content-type'] || 'unknown';
    const contentLength = req.headers['content-length'] || 'unknown';
    const bodyPreview = req.body ? JSON.stringify(req.body).substring(0, 200) : 'empty';
    
    console.log(`${timestamp} - POST REQUEST DETAILS:`);
    console.log(`  Content-Type: ${contentType}`);
    console.log(`  Content-Length: ${contentLength} bytes`);
    console.log(`  Body Preview: ${bodyPreview}${bodyPreview.length >= 200 ? '...' : ''}`);
  }
  
  next();
});

// CORS configuration
app.use((req, res, next) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Max-Age', '1728000');
    return res.status(204).end();
  }
  
  next();
});

// Authentication middleware
app.use((req, res, next) => {
  // Skip authentication for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${API_KEY}`;
  
  // Check if auth header matches exactly with expected value
  if (authHeader !== expectedAuth) {
    return res.status(401).json({
      error: {
        message: 'Unauthorized',
        type: 'invalid_request_error',
        code: 'invalid_api_key'
      }
    });
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Ollama proxy is running'
  });
});

// Function to proxy requests using native http module
function proxyRequest(req, res) {
  // Get original URL path and build target URL
  const targetPath = req.url;
  
  // Prepare request options
  const options = {
    hostname: OLLAMA_URL_PARSED.hostname,
    port: OLLAMA_URL_PARSED.port,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers }
  };

  // Clean up headers
  delete options.headers.host;
  delete options.headers.authorization;
  
  // Log forwarding details for POST requests
  if (req.method === 'POST') {
    console.log(`FORWARDING POST REQUEST TO OLLAMA:`);
    console.log(`  URL: ${OLLAMA_URL}${targetPath}`);
    console.log(`  Headers: ${JSON.stringify(options.headers)}`);
    if (req.body) {
      console.log(`  Body: ${JSON.stringify(req.body).substring(0, 200)}${JSON.stringify(req.body).length >= 200 ? '...' : ''}`);
    }
  }

  // Choose http or https module based on URL
  const httpModule = OLLAMA_URL_PARSED.protocol === 'https:' ? https : http;
  
  // Create proxy request
  const proxyReq = httpModule.request(options, (proxyRes) => {
    // Log response details
    console.log(`RECEIVED RESPONSE FROM OLLAMA:`);
    console.log(`  Status: ${proxyRes.statusCode}`);
    console.log(`  Headers: ${JSON.stringify(proxyRes.headers)}`);
    
    // Set response status
    res.status(proxyRes.statusCode);
    
    // Copy response headers (excluding CORS headers)
    const skipHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-expose-headers'
    ];
    
    Object.keys(proxyRes.headers).forEach(key => {
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, proxyRes.headers[key]);
      }
    });
    
    // Add custom header
    res.setHeader('x-powered-by', 'Ollama-Proxy');
    
    // Pipe response body
    proxyRes.pipe(res);
  });
  
  // Handle errors
  proxyReq.on('error', (error) => {
    console.error('Error forwarding request to Ollama:', error.message);
    res.status(500).json({
      error: {
        message: `Error connecting to Ollama server: ${error.message}`,
        type: 'server_error'
      }
    });
  });
  
  // Set timeout (600 seconds)
  proxyReq.setTimeout(600000);
  
  // Send request body for non-GET methods
  if (req.method !== 'GET' && req.body) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
  
  // End the request
  proxyReq.end();
}

// Handle all other requests and proxy them to Ollama
app.all('*', (req, res) => {
  proxyRequest(req, res);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Ollama proxy server started on port ${PORT}`);
  console.log(`Proxying requests to ${OLLAMA_URL}`);
});