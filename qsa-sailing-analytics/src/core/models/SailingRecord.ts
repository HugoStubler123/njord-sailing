/**
 * Single timestamped sailing data point
 * Core data structure for all telemetry data
 */
export interface SailingRecord {
  /** ISO timestamp */
  timestamp: string;

  /** GPS coordinates */
  latitude?: number;
  longitude?: number;

  /** Speed data */
  bsp?: number;  // Boat Speed (knots)
  sog?: number;  // Speed Over Ground (knots)
  vmg?: number;  // Velocity Made Good (knots)

  /** Wind data */
  tws?: number;  // True Wind Speed (knots)
  twa?: number;  // True Wind Angle (degrees, -180 to 180)
  twd?: number;  // True Wind Direction (degrees, 0-360)
  aws?: number;  // Apparent Wind Speed (knots)
  awa?: number;  // Apparent Wind Angle (degrees, -180 to 180)

  /** Heading and course */
  hdg?: number;  // Magnetic Heading (degrees, 0-360)
  cog?: number;  // Course Over Ground (degrees, 0-360)

  /** Heel and trim */
  heel?: number;    // Heel angle (degrees, positive = starboard down)
  trim?: number;    // Trim angle (degrees, positive = bow down)
  rudder?: number;  // Rudder angle (degrees, positive = port)

  /** Depth and environmental */
  depth?: number;      // Water depth (meters)
  waterTemp?: number;  // Water temperature (celsius)
  airTemp?: number;    // Air temperature (celsius)

  /** Derived/computed values */
  distance?: number;    // Cumulative distance sailed (nautical miles)
  vmgUpwind?: number;   // VMG upwind component
  vmgDownwind?: number; // VMG downwind component

  /** Data quality flags */
  quality?: 'good' | 'interpolated' | 'poor' | 'missing';
  source?: string;  // Source instrument/system
}

export interface SailingRecordBatch {
  records: SailingRecord[];
  startTime: string;
  endTime: string;
  count: number;
}