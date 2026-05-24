const express = require('express');
const router = express.Router();
const HazardZone = require('../models/HazardZone.js');
const authMiddleware = require('../middleware/authMiddleware.js');

// GET all hazard zones
router.get('/zones', async (req, res) => {
  try {
    const zones = await HazardZone.find({ isActive: true }).sort({ riskScore: -1 });
    res.json({
      success: true,
      count: zones.length,
      zones: zones
    });
  } catch (error) {
    console.error('Error fetching hazard zones:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET hazard zones by risk level
router.get('/zones/risk/:level', async (req, res) => {
  try {
    const validLevels = ['LOW', 'MEDIUM', 'HIGH'];
    const level = req.params.level.toUpperCase();
    
    if (!validLevels.includes(level)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid risk level. Must be LOW, MEDIUM, or HIGH' 
      });
    }
    
    const zones = await HazardZone.find({ riskLevel: level, isActive: true })
      .sort({ riskScore: -1 });
    
    res.json({
      success: true,
      riskLevel: level,
      count: zones.length,
      zones: zones
    });
  } catch (error) {
    console.error('Error fetching hazard zones by risk level:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET zone details by location
router.get('/zones/location/:location', async (req, res) => {
  try {
    const location = req.params.location.replace(/-/g, ' ');
    const zone = await HazardZone.findOne({ location: new RegExp(location, 'i') });
    
    if (!zone) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hazard zone not found' 
      });
    }
    
    res.json({ success: true, zone });
  } catch (error) {
    console.error('Error fetching hazard zone details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CHECK if coordinates are in a hazard zone (returns nearby zones)
router.post('/zones/check-location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude required' 
      });
    }
    
    // Find zones within 2km (approximate: 0.018 degrees ≈ 2km)
    const nearbyZones = await HazardZone.find({
      isActive: true,
      latitude: { $gte: latitude - 0.03, $lte: latitude + 0.03 },
      longitude: { $gte: longitude - 0.03, $lte: longitude + 0.03 }
    }).sort({ riskScore: -1 });
    
    // Calculate actual distance
    const zonesWithDistance = nearbyZones.map(zone => {
      const distance = getDistanceFromLatLonInKm(
        latitude, longitude, 
        zone.latitude, zone.longitude
      );
      return {
        ...zone.toObject(),
        distance: distance.toFixed(2)
      };
    }).filter(z => z.distance <= 2);
    
    const highRiskZone = zonesWithDistance.find(z => z.riskLevel === 'HIGH');
    
    res.json({
      success: true,
      nearbyZones: zonesWithDistance,
      inHighRiskZone: !!highRiskZone,
      closestZone: zonesWithDistance.length > 0 ? zonesWithDistance[0] : null
    });
  } catch (error) {
    console.error('Error checking location hazard zones:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET statistics
router.get('/zones/stats', async (req, res) => {
  try {
    const stats = {
      totalZones: await HazardZone.countDocuments({ isActive: true }),
      highRiskCount: await HazardZone.countDocuments({ riskLevel: 'HIGH', isActive: true }),
      mediumRiskCount: await HazardZone.countDocuments({ riskLevel: 'MEDIUM', isActive: true }),
      lowRiskCount: await HazardZone.countDocuments({ riskLevel: 'LOW', isActive: true }),
      totalIncidents: await HazardZone.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$incidentCount' } } }
      ]),
      totalAffected: await HazardZone.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$totalAffected' } } }
      ]),
      communHazardTypes: await HazardZone.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$hazardTypes' },
        { $group: { _id: '$hazardTypes', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching hazard statistics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to calculate distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = router;
