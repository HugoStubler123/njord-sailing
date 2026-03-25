import { describe, expect, it } from 'vitest';
import {
  toRadians,
  toDegrees,
  normalizeAngle,
  normalizeAngleSigned,
  angleDifference,
  lerp,
  clamp,
  isNear,
  roundTo,
} from './math';

describe('math utilities', () => {
  describe('angle conversions', () => {
    it('should convert degrees to radians correctly', () => {
      expect(toRadians(0)).toBe(0);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(toRadians(180)).toBeCloseTo(Math.PI);
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI);
    });

    it('should convert radians to degrees correctly', () => {
      expect(toDegrees(0)).toBe(0);
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90);
      expect(toDegrees(Math.PI)).toBeCloseTo(180);
      expect(toDegrees(2 * Math.PI)).toBeCloseTo(360);
    });

    it('should be reversible (degrees -> radians -> degrees)', () => {
      const testAngles = [0, 30, 45, 90, 135, 180, 270, 360];
      for (const angle of testAngles) {
        const result = toDegrees(toRadians(angle));
        expect(result).toBeCloseTo(angle, 10);
      }
    });
  });

  describe('angle normalization', () => {
    it('should normalize angles to 0-360 range', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-360)).toBe(0);
      expect(normalizeAngle(720)).toBe(0);
    });

    it('should normalize angles to -180 to 180 range', () => {
      expect(normalizeAngleSigned(0)).toBe(0);
      expect(normalizeAngleSigned(180)).toBe(180);
      expect(normalizeAngleSigned(-180)).toBe(-180);
      expect(normalizeAngleSigned(270)).toBe(-90);
      expect(normalizeAngleSigned(-270)).toBe(90);
      expect(normalizeAngleSigned(450)).toBe(90);
    });
  });

  describe('angle difference', () => {
    it('should calculate shortest angular distance', () => {
      expect(angleDifference(0, 90)).toBe(90);
      expect(angleDifference(90, 0)).toBe(-90);
      expect(angleDifference(10, 350)).toBe(-20); // Shortest path is backwards
      expect(angleDifference(350, 10)).toBe(20); // Shortest path is forwards
      expect(angleDifference(0, 180)).toBe(180);
      expect(angleDifference(180, 0)).toBe(-180);
    });

    it('should handle wind angle scenarios', () => {
      // Tacking from port to starboard
      expect(angleDifference(-45, 45)).toBe(90); // 90 degree turn

      // Gybing scenarios
      expect(angleDifference(160, -160)).toBe(40); // 40 degree gybe

      // Wind shifts
      expect(angleDifference(270, 280)).toBe(10); // 10 degree wind shift
    });
  });

  describe('interpolation and clamping', () => {
    it('should perform linear interpolation correctly', () => {
      expect(lerp(0, 100, 0)).toBe(0);
      expect(lerp(0, 100, 1)).toBe(100);
      expect(lerp(0, 100, 0.5)).toBe(50);
      expect(lerp(10, 20, 0.3)).toBe(13);
    });

    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('precision and comparison', () => {
    it('should check if numbers are near each other', () => {
      expect(isNear(1.0, 1.0001, 0.01)).toBe(true);
      expect(isNear(1.0, 1.01, 0.001)).toBe(false);
      expect(isNear(1.0, 1.0, 0.001)).toBe(true);

      // Default tolerance
      expect(isNear(1.0, 1.0001)).toBe(true);
      expect(isNear(1.0, 1.01)).toBe(false);
    });

    it('should round to specified decimal places', () => {
      expect(roundTo(1.2345, 2)).toBe(1.23);
      expect(roundTo(1.2365, 2)).toBe(1.24); // Rounding up
      expect(roundTo(1.0, 2)).toBe(1.0);
      expect(roundTo(1.999, 1)).toBe(2.0);
    });
  });

  describe('sailing-specific scenarios', () => {
    it('should handle wind angle calculations', () => {
      // True wind angle calculations
      const portTack = -45; // Port tack close hauled
      const starboardTack = 45; // Starboard tack close hauled

      expect(angleDifference(portTack, starboardTack)).toBe(90);
      expect(normalizeAngleSigned(portTack)).toBe(-45);
      expect(normalizeAngleSigned(starboardTack)).toBe(45);
    });

    it('should handle compass bearings', () => {
      const north = 0;
      const east = 90;
      const south = 180;
      const west = 270;

      expect(normalizeAngle(north)).toBe(0);
      expect(normalizeAngle(east)).toBe(90);
      expect(normalizeAngle(south)).toBe(180);
      expect(normalizeAngle(west)).toBe(270);

      // Test bearing from north to northeast
      expect(angleDifference(north, 45)).toBe(45);
    });
  });
});