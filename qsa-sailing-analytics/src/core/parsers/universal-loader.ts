/**
 * Universal File Loader Implementation
 * Auto-detects file format and routes to appropriate parser
 */

import type { UniversalLoader, BaseParser, ParserOptions, ParseResult, SupportedFormat } from '../models/Parser';
import { NmeaParserImpl } from './nmea-parser';
import { GpxParserImpl } from './gpx-parser';
import { CsvParserImpl } from './csv-parser';

export class UniversalLoaderImpl implements UniversalLoader {
  private _parsers: BaseParser[] = [];

  constructor() {
    // Register default parsers
    this.registerParser(new NmeaParserImpl());
    this.registerParser(new GpxParserImpl());
    this.registerParser(new CsvParserImpl());
  }

  get parsers(): BaseParser[] {
    return [...this._parsers];
  }

  registerParser(parser: BaseParser): void {
    // Remove existing parser for same format
    this._parsers = this._parsers.filter(p => p.format !== parser.format);
    this._parsers.push(parser);
  }

  async load(buffer: ArrayBuffer, filename: string, options: ParserOptions = {}): Promise<ParseResult> {
    try {
      const parser = this.getParser(buffer, filename);

      if (!parser) {
        return {
          success: false,
          error: `No suitable parser found for file: ${filename}`,
          stats: {
            recordsProcessed: 0,
            recordsParsed: 0,
            parseTime: 0,
            memoryUsed: 0,
          },
        };
      }

      console.log(`Using ${parser.format.toUpperCase()} parser for file: ${filename}`);

      const result = await parser.parse(buffer, filename, options);

      // Add format detection info to result
      if (result.success && result.session) {
        result.session.file = {
          ...result.session.file!,
          format: parser.format,
        };
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during file loading',
        stats: {
          recordsProcessed: 0,
          recordsParsed: 0,
          parseTime: 0,
          memoryUsed: 0,
        },
      };
    }
  }

  getParser(buffer: ArrayBuffer, filename?: string): BaseParser | null {
    // Score each parser based on confidence
    const scores: Array<{ parser: BaseParser; confidence: number }> = [];

    for (const parser of this._parsers) {
      let confidence = 0;

      // Check if parser can handle the file
      if (parser.canParse(buffer, filename)) {
        confidence += 0.5;

        // Bonus points for filename match
        if (filename) {
          const ext = `.${filename.toLowerCase().split('.').pop()}`;
          if (parser.extensions.includes(ext)) {
            confidence += 0.3;
          }
        }

        // Format-specific confidence boosts
        confidence += this.calculateFormatSpecificConfidence(parser, buffer, filename);

        scores.push({ parser, confidence });
      }
    }

    if (scores.length === 0) {
      return null;
    }

    // Return parser with highest confidence
    scores.sort((a, b) => b.confidence - a.confidence);
    return scores[0].parser;
  }

  private calculateFormatSpecificConfidence(
    parser: BaseParser,
    buffer: ArrayBuffer,
    filename?: string
  ): number {
    const text = new TextDecoder().decode(buffer.slice(0, 2048));
    let confidence = 0;

    switch (parser.format) {
      case 'nmea':
        // Check for NMEA sentence patterns
        const nmeaPattern = /^\$[A-Z]{2}[A-Z]{3},.*\*[0-9A-F]{2}$/m;
        if (nmeaPattern.test(text)) confidence += 0.4;

        // Check for common NMEA sentence types
        const commonSentences = ['$GPRMC', '$GPGGA', '$IIVHW', '$IIVWR'];
        const sentenceMatches = commonSentences.filter(sentence => text.includes(sentence)).length;
        confidence += sentenceMatches * 0.05;
        break;

      case 'gpx':
        // Check for GPX XML structure
        if (text.includes('<?xml') && text.includes('<gpx')) confidence += 0.4;
        if (text.includes('<trk>') || text.includes('<trkpt')) confidence += 0.2;
        if (text.includes('xmlns="http://www.topografix.com/GPX/')) confidence += 0.1;
        break;

      case 'csv':
        // Check for CSV characteristics
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length >= 2) {
          const firstLine = lines[0];
          const commaCount = (firstLine.match(/,/g) || []).length;
          const semicolonCount = (firstLine.match(/;/g) || []).length;

          if (commaCount >= 3 || semicolonCount >= 3) confidence += 0.2;

          // Check for sailing-related headers
          const sailingHeaders = [
            'time', 'lat', 'lon', 'bsp', 'tws', 'twa', 'hdg', 'speed', 'wind'
          ];
          const headerMatches = sailingHeaders.filter(header =>
            firstLine.toLowerCase().includes(header)).length;
          confidence += headerMatches * 0.02;
        }
        break;
    }

    return Math.min(confidence, 0.5); // Cap at 0.5 to not overwhelm other factors
  }

  getParserByFormat(format: SupportedFormat): BaseParser | null {
    return this._parsers.find(parser => parser.format === format) || null;
  }

  getSupportedFormats(): Array<{
    format: SupportedFormat;
    name: string;
    extensions: string[];
    description: string;
  }> {
    const formatInfo: Record<SupportedFormat, { name: string; description: string }> = {
      nmea: {
        name: 'NMEA 0183',
        description: 'Marine instrument data in NMEA format with GPS, wind, and speed data',
      },
      gpx: {
        name: 'GPX Track',
        description: 'GPS tracks with position and optional speed/course data',
      },
      csv: {
        name: 'CSV Data',
        description: 'Comma-separated values with configurable column mapping',
      },
      expedition: {
        name: 'Expedition Log',
        description: 'Expedition racing software log files',
      },
      velocitek: {
        name: 'Velocitek Data',
        description: 'Velocitek SpeedPuck and VCC data files',
      },
      bg: {
        name: 'B&G Instruments',
        description: 'B&G Zeus and network instrument data',
      },
      sailgp: {
        name: 'SailGP Data',
        description: 'High-frequency racing telemetry from SailGP',
      },
    };

    return this._parsers.map(parser => ({
      format: parser.format,
      name: formatInfo[parser.format]?.name || parser.format.toUpperCase(),
      extensions: parser.extensions,
      description: formatInfo[parser.format]?.description || `${parser.format} format data`,
    }));
  }

  /**
   * Validate file before parsing
   */
  validateFile(buffer: ArrayBuffer, filename?: string): {
    valid: boolean;
    format?: SupportedFormat;
    confidence?: number;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (buffer.byteLength === 0) {
      errors.push('File is empty');
      return { valid: false, errors, warnings };
    }

    if (buffer.byteLength > 500 * 1024 * 1024) { // 500MB
      warnings.push('Large file detected (>500MB), parsing may be slow');
    }

    // Try to detect format
    const parser = this.getParser(buffer, filename);
    if (!parser) {
      errors.push('Unsupported file format');
      return { valid: false, errors, warnings };
    }

    // Check if file content is readable
    try {
      const text = new TextDecoder().decode(buffer.slice(0, 1024));
      if (text.length === 0) {
        errors.push('File content is not readable as text');
        return { valid: false, errors, warnings };
      }
    } catch (error) {
      errors.push('File encoding is not supported (must be UTF-8)');
      return { valid: false, errors, warnings };
    }

    return {
      valid: errors.length === 0,
      format: parser.format,
      confidence: this.calculateFormatSpecificConfidence(parser, buffer, filename),
      errors,
      warnings,
    };
  }

  /**
   * Get file preview without full parsing
   */
  async getFilePreview(buffer: ArrayBuffer, filename?: string): Promise<{
    format?: SupportedFormat;
    sampleData: string;
    estimatedRecords: number;
    detectedColumns?: string[];
    timeRange?: { start: string; end: string };
  }> {
    const parser = this.getParser(buffer, filename);
    const text = new TextDecoder().decode(buffer);
    const lines = text.split('\n').filter(line => line.trim());

    const preview = {
      format: parser?.format,
      sampleData: lines.slice(0, 10).join('\n'), // First 10 lines
      estimatedRecords: 0,
      detectedColumns: undefined as string[] | undefined,
      timeRange: undefined as { start: string; end: string } | undefined,
    };

    if (!parser) return preview;

    switch (parser.format) {
      case 'nmea':
        preview.estimatedRecords = lines.filter(line => line.startsWith('$')).length;
        // Try to find time range from RMC sentences
        const rmcLines = lines.filter(line => line.includes('RMC'));
        if (rmcLines.length >= 2) {
          try {
            const firstTime = this.extractNmeaTime(rmcLines[0]);
            const lastTime = this.extractNmeaTime(rmcLines[rmcLines.length - 1]);
            if (firstTime && lastTime) {
              preview.timeRange = { start: firstTime, end: lastTime };
            }
          } catch {
            // Ignore time extraction errors
          }
        }
        break;

      case 'gpx':
        preview.estimatedRecords = (text.match(/<trkpt/g) || []).length;
        // Try to extract time range from first and last trackpoints
        const timeMatches = text.match(/<time>([^<]+)<\/time>/g);
        if (timeMatches && timeMatches.length >= 2) {
          const firstTime = timeMatches[0].match(/<time>([^<]+)<\/time>/)?.[1];
          const lastTime = timeMatches[timeMatches.length - 1].match(/<time>([^<]+)<\/time>/)?.[1];
          if (firstTime && lastTime) {
            preview.timeRange = { start: firstTime, end: lastTime };
          }
        }
        break;

      case 'csv':
        if (lines.length > 1) {
          const csvParser = parser as CsvParserImpl;
          const separator = this.detectCsvSeparator(lines[0]);
          preview.detectedColumns = lines[0].split(separator).map(col => col.trim());
          preview.estimatedRecords = lines.length - 1; // Exclude header

          // Try to extract time range if time column is detected
          const mapping = csvParser.detectColumns(preview.detectedColumns);
          if (mapping.timestamp) {
            try {
              const timeColIndex = preview.detectedColumns.indexOf(mapping.timestamp);
              if (timeColIndex >= 0 && lines.length >= 3) {
                const firstDataRow = lines[1].split(separator);
                const lastDataRow = lines[lines.length - 1].split(separator);

                if (firstDataRow[timeColIndex] && lastDataRow[timeColIndex]) {
                  const startTime = new Date(firstDataRow[timeColIndex]).toISOString();
                  const endTime = new Date(lastDataRow[timeColIndex]).toISOString();

                  if (!isNaN(new Date(startTime).getTime()) && !isNaN(new Date(endTime).getTime())) {
                    preview.timeRange = { start: startTime, end: endTime };
                  }
                }
              }
            } catch {
              // Ignore time extraction errors
            }
          }
        }
        break;
    }

    return preview;
  }

  private extractNmeaTime(sentence: string): string | null {
    // Extract time from RMC sentence: $GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
    const parts = sentence.split(',');
    if (parts.length >= 10 && parts[0].includes('RMC')) {
      const time = parts[1];
      const date = parts[9];

      if (time.length >= 6 && date.length >= 6) {
        const hour = time.substring(0, 2);
        const min = time.substring(2, 4);
        const sec = time.substring(4, 6);
        const day = date.substring(0, 2);
        const month = date.substring(2, 4);
        const year = '20' + date.substring(4, 6);

        return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
      }
    }
    return null;
  }

  private detectCsvSeparator(line: string): string {
    const separators = [',', ';', '\t', '|'];
    let bestSeparator = ',';
    let maxCount = 0;

    for (const sep of separators) {
      const count = (line.match(new RegExp(sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestSeparator = sep;
      }
    }

    return bestSeparator;
  }
}