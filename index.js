const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Enhanced headers to bypass Cloudflare
const getCloudflareHeaders = () => ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
});

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cache to store successful responses temporarily
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Main API endpoint
app.get('/api/inventory/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        console.log(`Fetching inventory for user: ${userId}`);
        
        // Check cache first
        const cacheKey = `user_${userId}`;
        const cached = cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            console.log(`Returning cached data for user: ${userId}`);
            return res.json(cached.data);
        }
        
        // Add random delay to appear more human-like
        await delay(Math.random() * 2000 + 1000); // 1-3 second delay
        
        const pekoraUrl = `https://www.pekora.zip/apisite/inventory/v1/users/${userId}/assets/collectibles`;
        
        const response = await axios.get(pekoraUrl, {
            timeout: 30000,
            headers: getCloudflareHeaders(),
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            }
        });
        
        // Check if we got HTML instead of JSON (Cloudflare challenge)
        if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
            console.error(`Cloudflare challenge detected for user: ${userId}`);
            return res.status(503).json({
                error: 'Service temporarily unavailable',
                message: 'API is currently protected by Cloudflare. Please try again later.',
                retryAfter: 60
            });
        }
        
        // Process the data
        let processedData;
        
        if (Array.isArray(response.data)) {
            // If response.data is directly an array
            processedData = {
                data: response.data.map(item => ({
                    name: item.name || 'Unknown Item',
                    recentAveragePrice: item.recentAveragePrice || 0,
                    assetId: item.assetId,
                    assetTypeId: item.assetTypeId,
                    userAssetId: item.userAssetId,
                    serialNumber: item.serialNumber,
                    originalPrice: item.originalPrice
                }))
            };
        } else if (response.data && response.data.data) {
            // If response.data has a 'data' property
            processedData = {
                data: response.data.data.map(item => ({
                    name: item.name || 'Unknown Item',
                    recentAveragePrice: item.recentAveragePrice || 0,
                    assetId: item.assetId,
                    assetTypeId: item.assetTypeId,
                    userAssetId: item.userAssetId,
                    serialNumber: item.serialNumber,
                    originalPrice: item.originalPrice
                }))
            };
        } else {
            // Fallback: wrap the entire response
            processedData = { data: response.data };
        }
        
        // Cache the successful response
        cache.set(cacheKey, {
            data: processedData,
            timestamp: Date.now()
        });
        
        console.log(`Successfully fetched ${processedData.data.length} items for user ${userId}`);
        res.json(processedData);
        
    } catch (error) {
        console.error(`Error fetching inventory for user ${userId}:`, error.message);
        
        if (error.response) {
            const status = error.response.status;
            
            if (status === 403) {
                res.status(503).json({
                    error: 'Service temporarily unavailable',
                    message: 'API is currently protected by anti-bot measures. Please try again later.',
                    retryAfter: 60
                });
            } else if (status === 404) {
                res.status(404).json({
                    error: 'User not found',
                    message: `No inventory data found for user ID: ${userId}`
                });
            } else if (status === 429) {
                res.status(429).json({
                    error: 'Rate limited',
                    message: 'Too many requests. Please wait before trying again.',
                    retryAfter: 30
                });
            } else {
                res.status(status).json({
                    error: 'API request failed',
                    message: `API returned status ${status}`,
                    statusCode: status
                });
            }
        } else if (error.code === 'ECONNABORTED') {
            res.status(408).json({
                error: 'Request timeout',
                message: 'The request took too long to complete'
            });
        } else {
            res.status(500).json({
                error: 'Internal server error',
                message: 'An unexpected error occurred'
            });
        }
    }
});

// Alternative endpoint that returns mock data when Pekora API is unavailable
app.get('/api/inventory/:userId/fallback', (req, res) => {
    const { userId } = req.params;
    
    console.log(`Returning fallback data for user: ${userId}`);
    
    // Return empty inventory when main API is down
    res.json({
        data: [],
        message: 'Fallback mode: Main API unavailable',
        userId: userId
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Pekora API Proxy',
        cacheSize: cache.size
    });
});

// Clear cache endpoint (for debugging)
app.post('/admin/clear-cache', (req, res) => {
    cache.clear();
    res.json({ message: 'Cache cleared successfully' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Pekora API Proxy Server',
        endpoints: {
            inventory: 'GET /api/inventory/:userId',
            fallback: 'GET /api/inventory/:userId/fallback',
            health: 'GET /health'
        },
        example: '/api/inventory/123456789'
    });
});

// Clean up old cache entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            cache.delete(key);
        }
    }
}, 10 * 60 * 1000);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API endpoint: /api/inventory/:userId`);
    console.log(`🔄 Fallback endpoint: /api/inventory/:userId/fallback`);
    console.log(`🏥 Health check: /health`);
});
