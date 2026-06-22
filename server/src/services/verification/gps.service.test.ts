import { checkGpsGeofence } from './gps.service';

describe('checkGpsGeofence', () => {
  const geofence = {
    geofenceLat: 53.4808,
    geofenceLng: -2.2426,
    geofenceRadiusMetres: 50,
  };

  it('returns inside when student is exactly at the geofence centre', () => {
    const result = checkGpsGeofence({
      studentLat: geofence.geofenceLat,
      studentLng: geofence.geofenceLng,
      ...geofence,
      gpsAccuracyMetres: 10,
    });

    expect(result.geofenceResult).toBe('inside');
    expect(result.distanceMetres).toBeCloseTo(0, 1);
  });

  it('returns outside when student is well beyond the radius plus accuracy', () => {
    const result = checkGpsGeofence({
      studentLat: 53.49,
      studentLng: geofence.geofenceLng,
      ...geofence,
      gpsAccuracyMetres: 10,
    });

    expect(result.geofenceResult).toBe('outside');
    expect(result.distanceMetres).toBeGreaterThan(geofence.geofenceRadiusMetres + 10);
  });

  it('returns uncertain when distance sits right on the radius edge with poor accuracy', () => {
    const result = checkGpsGeofence({
      studentLat: geofence.geofenceLat + 0.00045,
      studentLng: geofence.geofenceLng,
      ...geofence,
      gpsAccuracyMetres: 30,
    });

    expect(result.geofenceResult).toBe('uncertain');
  });

  it('falls back to the default accuracy buffer when accuracy is missing', () => {
    const result = checkGpsGeofence({
      studentLat: geofence.geofenceLat,
      studentLng: geofence.geofenceLng,
      ...geofence,
    });

    expect(result.geofenceResult).toBe('inside');
  });

  it('returns inside for a point well within the radius even with tight accuracy', () => {
    const result = checkGpsGeofence({
      studentLat: geofence.geofenceLat + 0.0001,
      studentLng: geofence.geofenceLng,
      ...geofence,
      gpsAccuracyMetres: 5,
    });

    expect(result.geofenceResult).toBe('inside');
  });
});