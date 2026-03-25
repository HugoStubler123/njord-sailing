/**
 * Debug parser issue
 */

import { UniversalLoaderImpl } from './core/parsers/universal-loader';

const SAMPLE_NMEA = `$GPRMC,123456,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
$IIVWR,144,R,12.4,N,6.4,M,23.1,K*5D`;

async function debugParser() {
  const loader = new UniversalLoaderImpl();
  const buffer = new TextEncoder().encode(SAMPLE_NMEA).buffer;

  console.log('Testing parser...');
  const result = await loader.load(buffer, 'test.nmea');

  console.log('Result:', JSON.stringify(result, null, 2));
}

debugParser().catch(console.error);