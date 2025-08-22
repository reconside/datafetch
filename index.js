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
      `https://www.pekora.zip/apisite/inventory/v1/users/${userId}/assets/collectibles`
    );
    
    if (!response.ok) {
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory data',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});