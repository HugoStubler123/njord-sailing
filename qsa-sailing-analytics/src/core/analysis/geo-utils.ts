/**
 * Geographical utilities for sailing analytics
 * Provides functions for distance, bearing, and coordinate calculations
 */

export interface Point {
  lat: number;
  lon: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First point (lat/lon in degrees)
 * @param point2 Second point (lat/lon in degrees)
 * @returns Distance in meters
 */
export function haversineDistance(point1: Point, point2: Point): number {
  const R = 6371000; // Earth's radius in meters

  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLonRad = ((point2.lon - point1.lon) * Math.PI) / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
           Math.cos(lat1Rad) * Math.cos(lat2Rad) *
           Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing (initial compass heading) from point1 to point2
 * @param point1 Starting point
 * @param point2 End point
 * @returns Bearing in degrees (0-360)
 */
export function bearing(point1: Point, point2: Point): number {
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLonRad = ((point2.lon - point1.lon) * Math.PI) / 180;

  const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

  const bearingRad = Math.atan2(y, x);
  let bearingDeg = (bearingRad * 180) / Math.PI;

  // Normalize to 0-360
  bearingDeg = (bearingDeg + 360) % 360;

  return bearingDeg;
}

/**
 * Calculate destination point given start point, bearing, and distance
 * @param start Starting point
 * @param bearingDeg Bearing in degrees
 * @param distanceMeters Distance in meters
 * @returns Destination point
 */
export function destination(start: Point, bearingDeg: number, distanceMeters: number): Point {
  const R = 6371000; // Earth's radius
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const lat1Rad = (start.lat * Math.PI) / 180;
  const lon1Rad = (start.lon * Math.PI) / 180;

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(distanceMeters / R) +
    Math.cos(lat1Rad) * Math.sin(distanceMeters / R) * Math.cos(bearingRad)
  );

  const lon2Rad = lon1Rad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distanceMeters / R) * Math.cos(lat1Rad),
    Math.cos(distanceMeters / R) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
  );

  return {
    lat: (lat2Rad * 180) / Math.PI,
    lon: (lon2Rad * 180) / Math.PI
  };
}

/**
 * Calculate course over ground (COG) from a series of points
 * @param points Array of GPS points with timestamps
 * @param index Current point index
 * @param lookbackSeconds Seconds to look back for course calculation
 * @returns Course in degrees (0-360)
 */
export function calculateCOG(
  points: Array<Point & { timestamp: Date }>,
  index: number,
  lookbackSeconds: number = 5
): number | null {
  if (index <= 0) return null;

  const currentTime = points[index].timestamp.getTime();
  const targetTime = currentTime - lookbackSeconds * 1000;

  // Find the point closest to our target time
  let bestIndex = 0;
  let bestTimeDiff = Math.abs(points[0].timestamp.getTime() - targetTime);

  for (let i = Math.max(0, index - 100); i < index; i++) {
    const timeDiff = Math.abs(points[i].timestamp.getTime() - targetTime);
    if (timeDiff < bestTimeDiff) {
      bestTimeDiff = timeDiff;
      bestIndex = i;
    }
  }

  if (bestIndex === index) return null;

  return bearing(points[bestIndex], points[index]);
}

/**
 * Calculate speed over ground (SOG) from GPS points
 * @param point1 Earlier point
 * @param point2 Later point
 * @returns Speed in knots
 */
export function calculateSOG(
  point1: Point & { timestamp: Date },
  point2: Point & { timestamp: Date }
): number {
  const distanceMeters = haversineDistance(point1, point2);
  const timeDiffSeconds = (point2.timestamp.getTime() - point1.timestamp.getTime()) / 1000;

  if (timeDiffSeconds <= 0) return 0;

  const speedMps = distanceMeters / timeDiffSeconds;
  const speedKnots = speedMps * 1.94384; // Convert m/s to knots

  return speedKnots;
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Calculate angular difference between two headings
 * @param angle1 First angle in degrees
 * @param angle2 Second angle in degrees
 * @returns Difference in degrees (-180 to +180)
 */
export function angleDifference(angle1: number, angle2: number): number {
  let diff = angle2 - angle1;

  // Normalize to [-180, 180]
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;

  return diff;
}

/**
 * Calculate total distance sailed along a track
 * @param points Array of GPS points
 * @returns Total distance in meters
 */
export function totalDistance(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Calculate track bounds (bounding box)
 * @param points Array of GPS points
 * @returns Bounding box {north, south, east, west}
 */
export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function calculateBounds(points: Point[]): Bounds | null {
  if (points.length === 0) return null;

  let north = points[0].lat;
  let south = points[0].lat;
  let east = points[0].lon;
  let west = points[0].lon;

  for (const point of points) {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lon);
    west = Math.min(west, point.lon);
  }

  return { north, south, east, west };
}