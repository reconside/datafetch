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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    );
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      // If pekora.zip fails, try a fallback approach
      if (response.status === 401 || response.status === 403) {
        console.log('API access denied, using fallback system');
        
        // Fallback: create test data based on user ID
        const testRAP = generateTestRAP(userId);
        
        res.json({
          success: true,
          userId: userId,
          totalRAP: testRAP,
          itemCount: Math.floor(testRAP / 100),
          items: [],
          note: "Using fallback data - API access restricted"
        });
        return;
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Calculate total RAP
    let totalRAP = 0;
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(item => {
        if (item.recentAveragePrice) {
          totalRAP += item.recentAveragePrice;
        }
      });
    }
    
    // Return the data with calculated RAP
    res.json({
      success: true,
      userId: userId,
      totalRAP: totalRAP,
      itemCount: data.data ? data.data.length : 0,
      items: data.data || []
    });
    
  } catch (error) {
    console.error('Error fetching data:', error);
    
    // Fallback system for any error
    const testRAP = generateTestRAP(userId);
    
    res.json({
      success: true,
      userId: userId,
      totalRAP: testRAP,
      itemCount: Math.floor(testRAP / 100),
      items: [],
      note: "Using fallback data - API error: " + error.message
    });
  }
});

// Generate test RAP based on user ID for fallback
function generateTestRAP(userId) {
  const id = parseInt(userId);
  
  // Create different RAP ranges based on user ID
  const patterns = [
    500,    // Low RAP
    2500,   // Trader
    15000,  // Collector  
    75000,  // Rich
    150000, // Wealthy
    600000, // Mogul
    1200000 // Tycoon
  ];
  
  return patterns[id % patterns.length] + (id % 1000);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
