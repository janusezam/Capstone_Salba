const fs = require('fs');
const path = require('path');

// Load GeoJSON boundaries
let geojsonData = null;

function loadGeoJSON() {
  if (geojsonData) return geojsonData;
  
  try {
    const geojsonPath = path.join(__dirname, '../data/barangay-boundaries.geojson');
    const fileContent = fs.readFileSync(geojsonPath, 'utf8');
    geojsonData = JSON.parse(fileContent);
    console.log(`[GEOJSON] Loaded ${geojsonData.features.length} barangay boundaries`);
    return geojsonData;
  } catch (error) {
    console.error('[GEOJSON] Error loading boundaries:', error.message);
    return null;
  }
}

/**
 * Point-in-polygon test using ray casting algorithm
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {array} polygon - Polygon coordinates [[lng, lat], ...]
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(lat, lng, polygon) {
  let isInside = false;
  
  // polygon is an array of [lng, lat] pairs
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lng1, lat1] = polygon[i];
    const [lng2, lat2] = polygon[j];
    
    const isLngBetween = (lng > lng1) !== (lng > lng2);
    const isLatIntersect = lat < (lat2 - lat1) * (lng - lng1) / (lng2 - lng1) + lat1;
    
    if (isLngBetween && isLatIntersect) {
      isInside = !isInside;
    }
  }
  
  return isInside;
}

/**
 * Find barangay name using GeoJSON point-in-polygon matching
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string|null} Barangay name or null if not found
 */
function findBarangayByPolygon(lat, lng) {
  if (!lat || !lng) return null;
  
  const geojson = loadGeoJSON();
  if (!geojson || !geojson.features) return null;
  
  // Check each feature
  for (const feature of geojson.features) {
    if (feature.geometry.type === 'Polygon') {
      const polygonRings = feature.geometry.coordinates;
      
      // Check if point is in the external ring (not in holes)
      if (isPointInPolygon(lat, lng, polygonRings[0])) {
        // Check holes if they exist
        let inHole = false;
        for (let i = 1; i < polygonRings.length; i++) {
          if (isPointInPolygon(lat, lng, polygonRings[i])) {
            inHole = true;
            break;
          }
        }
        
        if (!inHole) {
          const barangayName = feature.properties.barangay || feature.properties.NAME;
          console.log(`[LOCATION-RESOLVER] Point (${lat}, ${lng}) matched to "${barangayName}" via polygon`);
          return barangayName;
        }
      }
    }
  }
  
  return null;
}

/**
 * Resolve location name with fallback logic
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {function} fallbackFn - Fallback function if polygon matching fails
 * @returns {string|null} Barangay name
 */
function resolveLocationName(lat, lng, fallbackFn = null) {
  // Try polygon matching first
  const polygonResult = findBarangayByPolygon(lat, lng);
  if (polygonResult) {
    return polygonResult;
  }
  
  // Fall back to provided function if available
  if (fallbackFn && typeof fallbackFn === 'function') {
    return fallbackFn(lat, lng);
  }
  
  return null;
}

module.exports = {
  findBarangayByPolygon,
  resolveLocationName,
  loadGeoJSON,
  isPointInPolygon
};
