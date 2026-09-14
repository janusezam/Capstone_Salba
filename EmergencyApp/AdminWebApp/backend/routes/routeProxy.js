// routes/routeProxy.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory cache for recent route calculations (TTL: 60 seconds)
const routeCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const cleanOldCache = () => {
  const now = Date.now();
  for (const [key, entry] of routeCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      routeCache.delete(key);
    }
  }
};
const cleanupTimer = setInterval(cleanOldCache, 30000);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

/*
  GET /api/route?start=lat,lng&end=lat,lng
  Proxies to OSRM (Open Source Routing Machine) with fallback mirrors and caching.
  Response: returns GeoJSON feature compatible format.
*/
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ 
        message: 'start & end required (format: lat,lng)',
        received: { start, end }
      });
    }

    // Parse lat,lng format
    const startParts = start.split(',');
    const endParts = end.split(',');
    
    if (startParts.length !== 2 || endParts.length !== 2) {
      return res.status(400).json({ 
        message: 'Invalid format. Use lat,lng for both start and end',
        received: { start, end }
      });
    }

    const startLat = parseFloat(startParts[0]);
    const startLng = parseFloat(startParts[1]);
    const endLat = parseFloat(endParts[0]);
    const endLng = parseFloat(endParts[1]);

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      return res.status(400).json({ message: 'Invalid numeric coordinates' });
    }

    // Cache key rounded to 4 decimals (~11 meters)
    const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
    const cached = routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // OSRM format is lng,lat
    const startOSRM = `${startLng},${startLat}`;
    const endOSRM = `${endLng},${endLat}`;

    // Candidate routing endpoints (primary and fallback mirrors)
    const endpoints = [
      `https://router.project-osrm.org/route/v1/driving/${startOSRM};${endOSRM}?overview=full&geometries=geojson`,
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startOSRM};${endOSRM}?overview=full&geometries=geojson`,
      `http://router.project-osrm.org/route/v1/driving/${startOSRM};${endOSRM}?overview=full&geometries=geojson`
    ];

    let lastError = null;
    let routeData = null;

    for (const url of endpoints) {
      try {
        const response = await axios.get(url, { 
          timeout: 6000,
          headers: { 'User-Agent': 'SALBA-Emergency-App/1.0' }
        });

        if (response.data && response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          if (route.geometry && route.geometry.coordinates && route.geometry.coordinates.length > 0) {
            routeData = route;
            break;
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Route] Mirror failed (${url.split('/')[2]}): ${err.message}`);
      }
    }

    if (!routeData) {
      throw lastError || new Error('All routing services failed to return a route');
    }

    const feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeData.geometry.coordinates // [lng, lat] format
      },
      properties: {
        summary: {
          distance: routeData.distance, // in meters
          duration: routeData.duration   // in seconds
        }
      }
    };

    // Store in cache
    routeCache.set(cacheKey, { timestamp: Date.now(), data: feature });

    return res.json(feature);
  } catch (err) {
    console.error(`[Route] ❌ Routing service error: ${err.message}`);
    return res.status(500).json({ 
      message: 'Route service error', 
      error: err.message 
    });
  }
});

module.exports = router;
