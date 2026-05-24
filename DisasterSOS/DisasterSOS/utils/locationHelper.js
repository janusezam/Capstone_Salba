// utils/locationHelper.js - Convert GPS coordinates to nearest barangay/purok

import * as geolib from 'geolib';
import { malaybalayBarangays } from './locations';

/**
 * Find the nearest barangay/purok to given GPS coordinates
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {object} - Nearest location with label and formatted name
 */
export const getNearestBarangay = (latitude, longitude) => {
  if (!latitude || !longitude) {
    return {
      label: "Unknown Location",
      fullName: "Unknown Location (Bypasser)",
    };
  }

  let nearestLocation = null;
  let shortestDistance = Infinity;

  // Calculate distance to each barangay using geolocation library
  malaybalayBarangays.forEach((location) => {
    const distance = geolib.getDistance(
      { latitude, longitude },
      { latitude: location.latitude, longitude: location.longitude }
    );

    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestLocation = location;
    }
  });

  if (!nearestLocation) {
    return {
      label: "Unknown Location",
      fullName: "Unknown Location (Bypasser)",
    };
  }

  // Extract barangay and purok from label
  // Format: "Brgy X - Purok Y" or similar
  const match = nearestLocation.label.match(/Brgy\s(\d+)\s*-?\s*Purok\s(\d+)/i);
  
  if (match) {
    const brgy = match[1];
    const purok = match[2];
    return {
      label: nearestLocation.label,
      fullName: `Brgy ${brgy} Purok ${purok} (Bypasser)`,
      distance: shortestDistance, // in meters
      barangay: brgy,
      purok: purok,
    };
  }

  // Fallback to original label if pattern doesn't match
  return {
    label: nearestLocation.label,
    fullName: `${nearestLocation.label} (Bypasser)`,
    distance: shortestDistance,
  };
};

/**
 * Format location name for display
 * @param {string} barangay - Barangay number
 * @param {string} purok - Purok number
 * @returns {string} - Formatted location string
 */
export const formatLocationName = (barangay, purok) => {
  if (barangay && purok) {
    return `Brgy ${barangay} Purok ${purok} (Bypasser)`;
  }
  return "Current Location (Bypasser)";
};
