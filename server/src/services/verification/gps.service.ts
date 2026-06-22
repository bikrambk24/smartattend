import { GeofenceResult } from '@prisma/client';

interface GpsCheckInput {
  studentLat: number;
  studentLng: number;
  geofenceLat: number;
  geofenceLng: number;
  geofenceRadiusMetres: number;
  gpsAccuracyMetres?: number;
}

interface GpsCheckResult {
  distanceMetres: number;
  geofenceResult: GeofenceResult;
}

const EARTH_RADIUS_METRES = 6371000;
// Used when the phone doesn't report accuracy at all
const DEFAULT_ACCURACY_BUFFER_METRES = 15;

// Haversine formula: great-circle distance between two lat/lng points
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METRES * c;
}

export function checkGpsGeofence(input: GpsCheckInput): GpsCheckResult {
  const {
    studentLat,
    studentLng,
    geofenceLat,
    geofenceLng,
    geofenceRadiusMetres,
    gpsAccuracyMetres,
  } = input;

  const distanceMetres = haversineDistance(
    studentLat,
    studentLng,
    geofenceLat,
    geofenceLng,
  );

  const accuracy = gpsAccuracyMetres ?? DEFAULT_ACCURACY_BUFFER_METRES;

  const innerBound = geofenceRadiusMetres - accuracy;
  const outerBound = geofenceRadiusMetres + accuracy;

  let geofenceResult: GeofenceResult;

  if (distanceMetres <= innerBound) {
    geofenceResult = GeofenceResult.inside;
  } else if (distanceMetres > outerBound) {
    geofenceResult = GeofenceResult.outside;
  } else {
    geofenceResult = GeofenceResult.uncertain;
  }

  return { distanceMetres, geofenceResult };
}