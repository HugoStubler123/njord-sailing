/**
 * Integration Tests
 * Test end-to-end data flow from parsing to session creation
 */

import { describe, it, expect } from 'vitest';
import { UniversalLoaderImpl } from '../parsers/universal-loader';

const SAMPLE_NMEA = `$GPRMC,123456,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
$IIVWR,144,R,12.4,N,6.4,M,23.1,K*5D
$IIVHW,083.0,T,084.0,M,5.2,N,9.6,K*6E
$IIHDG,084.0,0.0,E,3.1,W*2E
$IIMWV,144,R,12.4,N,A*0E

$GPRMC,123457,A,4807.045,N,01131.010,E,023.1,085.2,230394,003.1,W*6B
$IIVWR,142,R,12.8,N,6.6,M,23.7,K*5A
$IIVHW,085.0,T,086.0,M,5.5,N,10.2,K*61
$IIHDG,086.0,0.0,E,3.1,W*2C
$IIMWV,142,R,12.8,N,A*09`;

describe('Integration Tests', () => {
  it('should parse NMEA data and create session', async () => {
    const loader = new UniversalLoaderImpl();
    const buffer = new TextEncoder().encode(SAMPLE_NMEA).buffer;

    const result = await loader.load(buffer, 'test.nmea');

    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session!.data.length).toBeGreaterThan(0);
    expect(result.session!.name).toBe('test');
    expect(result.session!.file?.format).toBe('nmea');
  });

  it('should detect parser format correctly', async () => {
    const loader = new UniversalLoaderImpl();

    // Test NMEA detection
    const nmeaBuffer = new TextEncoder().encode('$GPRMC,123456,A,4807.038,N').buffer;
    const nmeaResult = await loader.load(nmeaBuffer, 'test.nmea');
    expect(nmeaResult.session?.file?.format).toBe('nmea');

    // Test CSV detection
    const csvBuffer = new TextEncoder().encode('timestamp,latitude,longitude,bsp\n2023-01-01T12:00:00Z,47.123,11.456,5.2').buffer;
    const csvResult = await loader.load(csvBuffer, 'test.csv');
    expect(csvResult.session?.file?.format).toBe('csv');
  });

  it('should handle invalid data gracefully', async () => {
    const loader = new UniversalLoaderImpl();
    const buffer = new TextEncoder().encode('invalid data').buffer;

    const result = await loader.load(buffer, 'invalid.txt');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});