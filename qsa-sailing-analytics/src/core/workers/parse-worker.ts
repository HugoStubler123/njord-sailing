/**
 * Web Worker for parsing sailing data files
 * Offloads heavy parsing computation from the main thread
 */

import { UniversalLoaderImpl } from '../parsers/universal-loader';
import type { ParserOptions, ParseResult } from '../models/Parser';

// Web Worker message types
interface ParseMessage {
  type: 'parse';
  payload: {
    buffer: ArrayBuffer;
    filename: string;
    options?: ParserOptions;
  };
}

interface ProgressMessage {
  type: 'progress';
  payload: {
    progress: number;
    message?: string;
  };
}

interface ResultMessage {
  type: 'result';
  payload: ParseResult;
}

interface ErrorMessage {
  type: 'error';
  payload: {
    error: string;
    details?: Record<string, unknown>;
  };
}

type WorkerMessage = ParseMessage | ProgressMessage | ResultMessage | ErrorMessage;

// Worker context check
const isWorker = typeof importScripts === 'function';

if (isWorker) {
  // Running in Web Worker context
  const loader = new UniversalLoaderImpl();

  self.onmessage = async function(event: MessageEvent<ParseMessage>) {
    const { type, payload } = event.data;

    if (type === 'parse') {
      try {
        const { buffer, filename, options = {} } = payload;

        // Add progress callback
        const optionsWithProgress: ParserOptions = {
          ...options,
          onProgress: (progress: number) => {
            const progressMessage: ProgressMessage = {
              type: 'progress',
              payload: {
                progress,
                message: `Parsing ${filename}... ${Math.round(progress * 100)}%`,
              },
            };
            self.postMessage(progressMessage);
          },
        };

        // Parse the file
        const result = await loader.load(buffer, filename, optionsWithProgress);

        // Send result back to main thread
        const resultMessage: ResultMessage = {
          type: 'result',
          payload: result,
        };
        self.postMessage(resultMessage);

      } catch (error) {
        const errorMessage: ErrorMessage = {
          type: 'error',
          payload: {
            error: error instanceof Error ? error.message : 'Unknown parsing error',
            details: error instanceof Error ? { stack: error.stack } : undefined,
          },
        };
        self.postMessage(errorMessage);
      }
    }
  };
}

// Main thread interface for using the worker
export class ParseWorker {
  private worker: Worker | null = null;

  constructor() {
    // Create worker only when needed
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      // In browser/Electron renderer
      this.worker = new Worker(new URL('./parse-worker.ts', import.meta.url));
    }
  }

  async parseFile(
    buffer: ArrayBuffer,
    filename: string,
    options?: ParserOptions
  ): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback to synchronous parsing if Web Workers not available
        const loader = new UniversalLoaderImpl();
        loader.load(buffer, filename, options).then(resolve).catch(reject);
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'result':
            this.worker!.removeEventListener('message', handleMessage);
            resolve(payload);
            break;

          case 'error':
            this.worker!.removeEventListener('message', handleMessage);
            reject(new Error(payload.error));
            break;

          case 'progress':
            // Progress updates handled by callback in options
            if (options?.onProgress) {
              options.onProgress(payload.progress);
            }
            break;
        }
      };

      this.worker.addEventListener('message', handleMessage);

      // Send parse request
      const parseMessage: ParseMessage = {
        type: 'parse',
        payload: { buffer, filename, options },
      };
      this.worker.postMessage(parseMessage);
    });
  }

  async validateFile(buffer: ArrayBuffer, filename?: string): Promise<{
    valid: boolean;
    format?: string;
    confidence?: number;
    errors: string[];
    warnings: string[];
  }> {
    // Quick validation doesn't need a worker
    const loader = new UniversalLoaderImpl();
    return loader.validateFile(buffer, filename);
  }

  async getFilePreview(buffer: ArrayBuffer, filename?: string): Promise<{
    format?: string;
    sampleData: string;
    estimatedRecords: number;
    detectedColumns?: string[];
    timeRange?: { start: string; end: string };
  }> {
    // Preview doesn't need a worker
    const loader = new UniversalLoaderImpl();
    return loader.getFilePreview(buffer, filename);
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Export types for use in main thread
export type { ParseMessage, ProgressMessage, ResultMessage, ErrorMessage };

// Default export for use as worker
export default self;