import { describe, expect, it } from 'vitest';
import type { SailingRecord } from './SailingRecord';

describe('SailingRecord', () => {
  it('should create a valid sailing record with all optional properties', () => {
    const record: SailingRecord = {
      timestamp: '2024-03-24T12:00:00.000Z',
      latitude: 37.7749,
      longitude: -122.4194,
      bsp: 6.5,
      tws: 12.3,
      twa: 45,
      hdg: 180,
    };

    expect(record).toBeDefined();
    expect(record.timestamp).toBe('2024-03-24T12:00:00.000Z');
    expect(record.latitude).toBe(37.7749);
    expect(record.longitude).toBe(-122.4194);
    expect(record.bsp).toBe(6.5);
    expect(record.tws).toBe(12.3);
    expect(record.twa).toBe(45);
    expect(record.hdg).toBe(180);
  });

  it('should create a minimal sailing record with only timestamp', () => {
    const record: SailingRecord = {
      timestamp: '2024-03-24T12:00:00.000Z',
    };

    expect(record).toBeDefined();
    expect(record.timestamp).toBe('2024-03-24T12:00:00.000Z');
    expect(record.latitude).toBeUndefined();
    expect(record.bsp).toBeUndefined();
  });

  it('should handle quality flags correctly', () => {
    const record: SailingRecord = {
      timestamp: '2024-03-24T12:00:00.000Z',
      bsp: 6.5,
      quality: 'good',
      source: 'GPS',
    };

    expect(record.quality).toBe('good');
    expect(record.source).toBe('GPS');
  });

  it('should validate wind angle ranges conceptually', () => {
    // Test that TWA can be in valid range (-180 to 180)
    const record1: SailingRecord = {
      timestamp: '2024-03-24T12:00:00.000Z',
      twa: -180, // Port tack, extreme
    };

    const record2: SailingRecord = {
      timestamp: '2024-03-24T12:00:00.000Z',
      twa: 180, // Starboard tack, extreme
    };

    const record3: SailingRecord = {
      timestamp: '2024-03-24T12:00:00.000Z',
      twa: 0, // Dead downwind
    };

    expect(record1.twa).toBe(-180);
    expect(record2.twa).toBe(180);
    expect(record3.twa).toBe(0);
  });

  it('should handle all speed measurements', () => {
    const record: SailingRecord = {
      timestamp: '2024-03-24T12:00:00.000Z',
      bsp: 6.5, // Boat speed
      sog: 6.2, // Speed over ground (accounting for current)
      vmg: 4.8, // Velocity made good (upwind/downwind component)
    };

    expect(record.bsp).toBe(6.5);
    expect(record.sog).toBe(6.2);
    expect(record.vmg).toBe(4.8);

    // Conceptual validation: SOG might be different from BSP due to current
    expect(typeof record.bsp).toBe('number');
    expect(typeof record.sog).toBe('number');
    expect(typeof record.vmg).toBe('number');
  });
});

describe('SailingRecordBatch', () => {
  it('should create a valid record batch', () => {
    const records: SailingRecord[] = [
      {
        timestamp: '2024-03-24T12:00:00.000Z',
        bsp: 6.5,
      },
      {
        timestamp: '2024-03-24T12:01:00.000Z',
        bsp: 6.8,
      },
    ];

    const batch = {
      records,
      startTime: '2024-03-24T12:00:00.000Z',
      endTime: '2024-03-24T12:01:00.000Z',
      count: 2,
    };

    expect(batch.records).toHaveLength(2);
    expect(batch.count).toBe(2);
    expect(batch.startTime).toBe('2024-03-24T12:00:00.000Z');
    expect(batch.endTime).toBe('2024-03-24T12:01:00.000Z');
  });
});