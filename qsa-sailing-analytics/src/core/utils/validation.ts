/**
 * Data validation utilities for sailing data
 */

/**
 * Check if a speed value is valid
 */
export function isValidSpeed(speed: number, maxSpeed = 100): boolean {
  return !isNaN(speed) && speed >= 0 && speed <= maxSpeed;
}

/**
 * Check if an angle is valid within specified range
 */
export function isValidAngle(angle: number, min = 0, max = 360): boolean {
  return !isNaN(angle) && angle >= min && angle <= max;
}

/**
 * Check if a coordinate (latitude/longitude) is valid
 */
export function isValidCoordinate(coord: number, min: number, max: number): boolean {
  return !isNaN(coord) && coord >= min && coord <= max;
}

/**
 * Check if a timestamp is valid
 */
export function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Check if a sailing record has minimum required fields
 */
export function isValidRecord(record: any): boolean {
  return (
    record &&
    record.timestamp &&
    isValidTimestamp(record.timestamp) &&
    (record.latitude !== undefined || record.bsp !== undefined)
  );
}

/**
 * Validate GPS coordinates
 */
export function isValidGPS(latitude?: number, longitude?: number): boolean {
  if (latitude === undefined || longitude === undefined) return false;
  return (
    isValidCoordinate(latitude, -90, 90) &&
    isValidCoordinate(longitude, -180, 180)
  );
}

/**
 * Check if wind data is reasonable
 */
export function isValidWindData(speed?: number, angle?: number): boolean {
  if (speed !== undefined && !isValidSpeed(speed, 200)) return false; // Max 200 knots
  if (angle !== undefined && !isValidAngle(angle, -180, 180)) return false;
  return true;
}

/**
 * Detect speed spikes (unrealistic speed changes)
 */
export function detectSpeedSpike(
  currentSpeed: number,
  previousSpeed: number,
  timeGap: number, // seconds
  maxAcceleration = 5 // knots per second
): boolean {
  if (timeGap <= 0) return false;

  const speedChange = Math.abs(currentSpeed - previousSpeed);
  const acceleration = speedChange / timeGap;

  return acceleration > maxAcceleration;
}

/**
 * Detect GPS jumps (unrealistic position changes)
 */
export function detectGPSJump(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  timeGap: number, // seconds
  maxSpeed = 50 // knots
): boolean {
  const distance = calculateDistance(lat1, lon1, lat2, lon2); // nautical miles
  const speed = distance / (timeGap / 3600); // knots

  return speed > maxSpeed;
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in nautical miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}