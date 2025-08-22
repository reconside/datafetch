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

// Proxy route for inventory data
app.get('/api/inventory/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  console.log(`Fetching inventory for user: ${userId}`);
  
  try {
    const response = await fetch(
      `https://www.pekora.zip/apisite/inventory/v1/users/${userId}/assets/collectibles`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site'
        }
      }
    );
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers.raw());
    
    const responseText = await response.text();
    console.log(`Response body: ${responseText.substring(0, 500)}...`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    // Calculate total RAP from the REAL data
    let totalRAP = 0;
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(item => {
        if (item.recentAveragePrice) {
          totalRAP += item.recentAveragePrice;
        }
      });
    }
    
    console.log(`Calculated total RAP: ${totalRAP} from ${data.data ? data.data.length : 0} items`);
    
    // Return the REAL data with calculated RAP
    res.json({
      success: true,
      userId: userId,
      totalRAP: totalRAP,
      itemCount: data.data ? data.data.length : 0,
      items: data.data || []
    });
    
  } catch (error) {
    console.error('Error fetching data:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory data',
      message: error.message,
      userId: userId
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
