// routes/routeProxy.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

/*
  GET /api/route?start=lat,lng&end=lat,lng
  Proxies to OSRM (Open Source Routing Machine) for fast routing.
  Response: returns GeoJSON feature compatible format.
*/
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    console.log(`\n[Route] ========== REQUEST RECEIVED ==========`);
    console.log(`[Route] Query params - start: ${start}, end: ${end}`);
    
    if (!start || !end) {
      console.error('[Route] Missing start or end parameters');
      return res.status(400).json({ 
        message: 'start & end required (format: lat,lng)',
        received: { start, end }
      });
    }

    // Parse lat,lng format
    const startParts = start.split(',');
    const endParts = end.split(',');
    
    if (startParts.length !== 2 || endParts.length !== 2) {
      console.error('[Route] Invalid coordinate format');
      return res.status(400).json({ 
        message: 'Invalid format. Use lat,lng for both start and end',
        received: { start, end }
      });
    }

    const startLat = parseFloat(startParts[0]);
    const startLng = parseFloat(startParts[1]);
    const endLat = parseFloat(endParts[0]);
    const endLng = parseFloat(endParts[1]);

    // OSRM format is lng,lat (reversed)
    const startOSRM = `${startLng},${startLat}`;
    const endOSRM = `${endLng},${endLat}`;
    
    console.log(`[Route] Using OSRM Demo Server`);
    console.log(`[Route] Route: (${startLat}, ${startLng}) → (${endLat}, ${endLng})`);

    // Use OSRM Demo server (free, no setup needed)
    const url = `http://router.project-osrm.org/route/v1/driving/${startOSRM};${endOSRM}?overview=full&geometries=geojson`;
    
    console.log(`[Route] Calling OSRM API...`);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    console.log(`[Route] ✅ OSRM Response status: ${response.status}`);
    
    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      console.error('[Route] ❌ No route returned by OSRM');
      return res.status(500).json({ 
        message: 'No route returned from OSRM',
        data: response.data
      });
    }

    const route = response.data.routes[0];
    
    if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
      console.error('[Route] ❌ Route has no coordinates');
      return res.status(500).json({ 
        message: 'Route has no coordinates',
        route: route
      });
    }

    // Convert OSRM response to our standard format
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: route.geometry.coordinates  // Already in [lng, lat] format
      },
      properties: {
        summary: {
          distance: route.distance,  // in meters
          duration: route.duration   // in seconds
        }
      }
    };

    console.log(`[Route] ✅ Route successfully processed`);
    console.log(`[Route] Distance: ${(route.distance / 1000).toFixed(2)} km`);
    console.log(`[Route] Duration: ${(route.duration / 60).toFixed(0)} min`);
    console.log(`[Route] Coordinates: ${route.geometry.coordinates.length} points`);
    console.log(`[Route] ========== ROUTE RESPONSE SENT ==========\n`);
    
    res.json(feature);
  } catch (err) {
    console.error(`[Route] ❌ ERROR OCCURRED`);
    console.error(`[Route] Error type: ${err.constructor.name}`);
    console.error(`[Route] Error message: ${err.message}`);
    
    if (err.response) {
      console.error(`[Route] API Error Status: ${err.response.status}`);
      console.error(`[Route] API Error Data:`, JSON.stringify(err.response.data).substring(0, 500));
    }
    
    if (err.code) {
      console.error(`[Route] Error code: ${err.code}`);
    }
    
    console.error(`[Route] ========== ERROR RESPONSE SENT ==========\n`);
    
    res.status(500).json({ 
      message: 'Route service error', 
      error: err.message,
      errorType: err.constructor.name
    });
  }
});

module.exports = router;
