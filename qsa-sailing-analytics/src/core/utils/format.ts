/**
 * Formatting Utilities
 * Functions for formatting data for display
 */

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format speed with units
 */
export function formatSpeed(speed: number | undefined, unit: 'knots' | 'mph' | 'kph' = 'knots'): string {
  if (speed === undefined) return '--';

  let value = speed;
  let unitLabel = 'kts';

  switch (unit) {
    case 'mph':
      value = speed * 1.15078; // knots to mph
      unitLabel = 'mph';
      break;
    case 'kph':
      value = speed * 1.852; // knots to kph
      unitLabel = 'kph';
      break;
  }

  return `${value.toFixed(1)} ${unitLabel}`;
}

/**
 * Format distance with units
 */
export function formatDistance(distance: number | undefined, unit: 'nm' | 'km' | 'mi' = 'nm'): string {
  if (distance === undefined) return '--';

  let value = distance;
  let unitLabel = 'nm';

  switch (unit) {
    case 'km':
      value = distance * 1.852; // nautical miles to km
      unitLabel = 'km';
      break;
    case 'mi':
      value = distance * 1.15078; // nautical miles to miles
      unitLabel = 'mi';
      break;
  }

  return `${value.toFixed(2)} ${unitLabel}`;
}

/**
 * Format angle in degrees
 */
export function formatAngle(angle: number | undefined): string {
  if (angle === undefined) return '--';
  return `${Math.round(angle)}°`;
}

/**
 * Format coordinates
 */
export function formatCoordinate(lat: number | undefined, lng: number | undefined): string {
  if (lat === undefined || lng === undefined) return '--';

  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(5)}°${latDir}, ${Math.abs(lng).toFixed(5)}°${lngDir}`;
}

/**
 * Format timestamp
 */
export function formatTimestamp(timestamp: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(timestamp);

  if (format === 'long') {
    return date.toLocaleString();
  }

  return date.toLocaleTimeString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}