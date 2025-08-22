const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Roblox RAP Proxy Server is running!' });
});

// Simple proxy route - just pass through all data
app.get('/api/inventory/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  console.log(`Proxying request for user: ${userId}`);
  
  try {
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const response = await fetch(
      `https://www.pekora.zip/apisite/inventory/v1/users/${userId}/assets/collectibles`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.pekora.zip/',
          'Origin': 'https://www.pekora.zip',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 10000
      }
    );
    
    console.log(`Response status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error response: ${errorText.substring(0, 200)}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const htmlResponse = await response.text();
      console.log(`Non-JSON response received: ${htmlResponse.substring(0, 200)}`);
      
      // Return a structured error response
      return res.status(502).json({
        error: 'API returned non-JSON response',
        message: 'The target API is blocking requests or returning HTML error pages',
        suggestion: 'The API may be rate-limited or blocking automated requests'
      });
    }
    
    const data = await response.json();
    console.log(`Successfully fetched data for user ${userId}`);
    
    // Just return the raw data - let Roblox handle everything
    res.json(data);
    
  } catch (error) {
    console.error(`Proxy error for user ${userId}:`, error.message);
    
    // Return a proper error response that Roblox can handle
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message,
      userId: userId,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
