const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Main API endpoint that your Roblox script will call
app.get('/api/inventory/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        console.log(`Fetching inventory for user: ${userId}`);
        
        // Call the Pekora API
        const pekoraUrl = `https://www.pekora.zip/apisite/inventory/v1/users/${userId}/assets/collectibles`;
        
        const response = await axios.get(pekoraUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        // Process the data to match your Roblox script's expected format
        const processedData = {
            data: response.data.map(item => ({
                name: item.name || 'Unknown Item',
                recentAveragePrice: item.recentAveragePrice || 0,
                assetId: item.assetId,
                assetType: item.assetType
            }))
        };
        
        console.log(`Successfully fetched ${processedData.data.length} items for user ${userId}`);
        res.json(processedData);
        
    } catch (error) {
        console.error(`Error fetching inventory for user ${userId}:`, error.message);
        
        // Return appropriate error response
        if (error.response) {
            res.status(error.response.status).json({
                error: 'API request failed',
                message: error.response.data || error.message,
                statusCode: error.response.status
            });
        } else if (error.code === 'ECONNABORTED') {
            res.status(408).json({
                error: 'Request timeout',
                message: 'The request took too long to complete'
            });
        } else {
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Pekora API Proxy'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Pekora API Proxy Server',
        usage: 'GET /api/inventory/:userId',
        example: '/api/inventory/123456789'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API endpoint: /api/inventory/:userId`);
    console.log(`🏥 Health check: /health`);
});
