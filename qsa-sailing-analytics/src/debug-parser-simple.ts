/**
 * Debug parser issue - test individual sentence parsing
 */

import { NmeaParserImpl } from './core/parsers/nmea-parser';

const parser = new NmeaParserImpl();

// Test individual sentence parsing
const sentences = [
  '$GPRMC,123456,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A',
  '$IIVWR,144,R,12.4,N,6.4,M,23.1,K*5D',
];

console.log('Testing individual sentence parsing...');

for (const sentence of sentences) {
  console.log(`\nTesting: ${sentence}`);

  // Test checksum validation
  const checksum = (parser as any).validateChecksum(sentence);
  console.log('Checksum valid:', checksum);

  // Test sentence parsing
  const result = parser.parseSentence(sentence);
  console.log('Parse result:', result);
}