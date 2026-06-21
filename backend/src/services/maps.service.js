import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Deterministically generates a distance between 5.0 and 35.0 km based on origin/destination name lengths/character codes.
 * This guarantees consistent mock values for unit testing.
 */
function getDeterministicDistance(origin, destination) {
  let hash = 0;
  const combined = (origin + destination).toLowerCase().trim();
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);
  const distance = 5.0 + (absHash % 300) / 10;
  return parseFloat(distance.toFixed(1));
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs} hr ${remainingMins} min` : `${hrs} hr`;
}

function getMockJourneyOptions(origin, destination) {
  const distance = getDeterministicDistance(origin, destination);
  const options = [];

  // 1. Driving (Car)
  options.push({
    mode: 'Driving',
    rawMode: 'driving',
    transitType: null,
    distanceKm: parseFloat((distance * 1.05).toFixed(2)),
    durationSec: Math.round(distance * 1.05 * 120), // 2 mins per km
    durationText: formatDuration(distance * 1.05 * 120),
  });

  // 2. Transit (Metro or Bus depending on distance threshold)
  const isMetro = distance > 12;
  options.push({
    mode: isMetro ? 'Metro' : 'Bus',
    rawMode: 'transit',
    transitType: isMetro ? 'metro' : 'bus',
    distanceKm: distance,
    durationSec: Math.round(distance * 180), // 3 mins per km
    durationText: formatDuration(distance * 180),
  });

  // 3. Cycling (Bicycle)
  options.push({
    mode: 'Cycling',
    rawMode: 'bicycling',
    transitType: null,
    distanceKm: parseFloat((distance * 0.95).toFixed(2)),
    durationSec: Math.round(distance * 0.95 * 240), // 4 mins per km
    durationText: formatDuration(distance * 0.95 * 240),
  });

  // 4. Walking
  options.push({
    mode: 'Walking',
    rawMode: 'walking',
    transitType: null,
    distanceKm: parseFloat((distance * 0.9).toFixed(2)),
    durationSec: Math.round(distance * 0.9 * 720), // 12 mins per km
    durationText: formatDuration(distance * 0.9 * 720),
  });

  return options;
}

async function fetchGoogleRoute(origin, destination, mode, apiKey) {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const distanceKm = parseFloat((leg.distance.value / 1000).toFixed(2));
    const durationSec = leg.duration.value;
    const durationText = leg.duration.text;

    let resolvedMode = mode;
    let transitType = null;

    if (mode === 'transit') {
      // Find the first transit step details
      for (const step of leg.steps) {
        if (step.travel_mode === 'TRANSIT' && step.transit_details) {
          const vehicleType = step.transit_details.line?.vehicle?.type;
          if (vehicleType) {
            const v = vehicleType.toUpperCase();
            if (['SUBWAY', 'TRAM', 'METRO_RAIL', 'HEAVY_RAIL', 'COMMUTER_TRAIN'].includes(v)) {
              resolvedMode = 'Metro';
              transitType = 'metro';
              break;
            } else if (v === 'BUS') {
              resolvedMode = 'Bus';
              transitType = 'bus';
              break;
            }
          }
        }
      }
      // If transit type cannot be determined, keep it resolved as 'Transit'
      if (resolvedMode === 'transit') {
        resolvedMode = 'Transit';
      }
    } else {
      if (mode === 'driving') resolvedMode = 'Driving';
      else if (mode === 'walking') resolvedMode = 'Walking';
      else if (mode === 'bicycling') resolvedMode = 'Cycling';
    }

    return {
      mode: resolvedMode,
      rawMode: mode,
      transitType,
      distanceKm,
      durationSec,
      durationText,
    };
  } catch (error) {
    console.error(`Error fetching Google Route for mode ${mode}:`, error);
    return null;
  }
}

/**
 * Fetch and construct journey comparison routes from Google Maps Directions API.
 * Falls back to deterministic mock generators if API Key is not present or error occurs.
 */
export async function getJourneyOptions(origin, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const modes = ['driving', 'transit', 'walking', 'bicycling'];
      const results = await Promise.all(
        modes.map(mode => fetchGoogleRoute(origin, destination, mode, apiKey))
      );

      const validOptions = results.filter(Boolean);
      if (validOptions.length > 0) {
        return validOptions;
      }
    } catch (e) {
      console.warn('Google Maps API request failed, falling back to mock routing.', e);
    }
  }

  // Fallback mock routing
  return getMockJourneyOptions(origin, destination);
}
