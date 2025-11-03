/**
 * Structured logging SDK for browser extension
 * Provides unified logging across background, content, and UI contexts
 */

interface LoggerConfig {
  env: 'development' | 'production';
  sinkUrl?: string;
  batchMs?: number;
  maxBatch?: number;
  maxBytesPerEvent?: number;
  sampleRate?: number;
}

interface LogEvent {
  ts: string;
  level: string;
  event: string;
  component: string;
  corrId: string;
  sessionId: string;
  extVersion: string;
  runtime: 'chrome' | 'firefox';
  context: string;
  [key: string]: any;
}

class Logger {
  private config: Required<LoggerConfig>;
  private corrId: string | null = null;
  private sessionId: string | null = null;
  private extVersion: string;
  private runtime: 'chrome' | 'firefox';
  private context: string;
  private eventQueue: LogEvent[] = [];
  private flushTimer: number | null = null;
  private isOnline: boolean = true;
  private backoffAttempts = 0;
  private maxBackoff = 60000; // 60 seconds max

  constructor(config: LoggerConfig) {
    this.config = {
      env: config.env,
      sinkUrl: config.sinkUrl || '',
      batchMs: config.batchMs || 1500,
      maxBatch: config.maxBatch || 40,
      maxBytesPerEvent: config.maxBytesPerEvent || 4096,
      sampleRate: config.sampleRate || 1.0,
    };

    this.extVersion = chrome.runtime.getManifest().version || 'unknown';
    this.runtime = 'chrome';
    this.context = this.detectContext();

    this.initializeOnlineListener();
  }

  private detectContext(): string {
    // Try to detect the context we're running in
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const manifest = chrome.runtime.getManifest();
        if (manifest.background?.service_worker) {
          return 'background';
        }
      }

      if (typeof document !== 'undefined' && document.location) {
        if (document.location.protocol === 'chrome-extension:') {
          // Check if it's a sidepanel, popup, or options page
          const pathname = document.location.pathname;
          if (pathname.includes('sidepanel') || pathname.includes('options') || pathname.includes('popup')) {
            return 'ui';
          }
        }
        return 'content';
      }
    } catch (e) {
      // Fallback
    }
    return 'unknown';
  }

  private async initializeSession(): Promise<void> {
    if (this.sessionId) return;

    try {
      const stored = await chrome.storage.local.get(['logger_sessionId', 'logger_corrId']);
      this.sessionId = stored.logger_sessionId || this.generateId();
      this.corrId = stored.logger_corrId || this.generateId();

      // Store for persistence
      await chrome.storage.local.set({
        logger_sessionId: this.sessionId,
        logger_corrId: this.corrId,
      });
    } catch (e) {
      // Fallback to memory only
      this.sessionId = this.generateId();
      this.corrId = this.generateId();
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private redactSensitive(fields: Record<string, any>): Record<string, any> {
    const redacted = { ...fields };
    
    // Never log raw sensitive data
    const sensitiveKeys = ['prompt', 'text', 'password', 'token', 'secret', 'key'];
    const sensitiveValues = [];

    for (const [key, value] of Object.entries(redacted)) {
      const keyLower = key.toLowerCase();
      if (sensitiveKeys.some(sk => keyLower.includes(sk))) {
        if (typeof value === 'string') {
          redacted[key] = `[REDACTED: ${key}] (len=${value.length})`;
        } else {
          redacted[key] = `[REDACTED: ${key}]`;
        }
      }

      // Check for potential secrets in values
      if (typeof value === 'string' && value.length > 16 && /^[A-Za-z0-9_\-./+=]+$/.test(value)) {
        sensitiveValues.push(key);
      }
    }

    if (sensitiveValues.length > 0) {
      redacted._redactedFields = sensitiveValues;
    }

    return redacted;
  }

  private clampFields(fields: Record<string, any>): Record<string, any> {
    const jsonStr = JSON.stringify(fields);
    if (jsonStr.length <= this.config.maxBytesPerEvent) {
      return fields;
    }

    // Truncate fields to fit
    const clamped: Record<string, any> = {};
    let currentSize = 2; // Account for {}

    for (const [key, value] of Object.entries(fields)) {
      const entryStr = `"${key}":${JSON.stringify(value)},`;
      if (currentSize + entryStr.length <= this.config.maxBytesPerEvent - 50) {
        clamped[key] = value;
        currentSize += entryStr.length;
      } else {
        clamped._truncated = true;
        break;
      }
    }

    return clamped;
  }

  private async log(eventName: string, level: string, fields: Record<string, any> = {}): Promise<void> {
    // Apply sampling
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    // Redact sensitive data
    const redacted = this.redactSensitive(fields);
    const clamped = this.clampFields(redacted);

    await this.initializeSession();

    const event: LogEvent = {
      ts: new Date().toISOString(),
      level,
      event: eventName,
      component: this.context,
      corrId: this.corrId || this.generateId(),
      sessionId: this.sessionId || this.generateId(),
      extVersion: this.extVersion,
      runtime: this.runtime,
      context: this.context,
      ...clamped,
    };

    this.eventQueue.push(event);

    // Schedule flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, this.config.batchMs);
    }

    // Immediate flush if batch is full
    if (this.eventQueue.length >= this.config.maxBatch) {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // Console logging for development
    for (const event of events) {
      const logFunc = event.level === 'error' ? console.error : 
                      event.level === 'warn' ? console.warn :
                      event.level === 'debug' ? console.debug : console.log;
      logFunc(`[${event.ts}] [${event.level}] ${event.event}:`, event);
    }

    // Send to sink in production if configured
    if (this.config.env === 'production' && this.config.sinkUrl && this.isOnline) {
      try {
        await this.sendToSink(events);
        this.backoffAttempts = 0;
      } catch (error) {
        console.error('Failed to send logs to sink:', error);
        this.backoffAttempts++;
        // Re-queue events on failure
        this.eventQueue.unshift(...events);
      }
    }
  }

  private async sendToSink(events: LogEvent[]): Promise<void> {
    if (!this.config.sinkUrl) return;

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    // Get current correlation ID
    if (this.corrId) {
      headers['x-correlation-id'] = this.corrId;
    }

    const response = await fetch(this.config.sinkUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Check if server returned a new correlation ID
    const newCorrId = response.headers.get('x-correlation-id');
    if (newCorrId && newCorrId !== this.corrId) {
      this.corrId = newCorrId;
      await chrome.storage.local.set({ logger_corrId: newCorrId });
    }
  }

  private initializeOnlineListener(): void {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flush(); // Try to flush when back online
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  // Public API
  debug(eventName: string, fields: Record<string, any> = {}): void {
    this.log(eventName, 'debug', fields).catch(console.error);
  }

  info(eventName: string, fields: Record<string, any> = {}): void {
    this.log(eventName, 'info', fields).catch(console.error);
  }

  warn(eventName: string, fields: Record<string, any> = {}): void {
    this.log(eventName, 'warn', fields).catch(console.error);
  }

  error(eventName: string, fields: Record<string, any> = {}): void {
    this.log(eventName, 'error', fields).catch(console.error);
  }

  child(fields: Record<string, any>): Logger {
    // Return a child logger that adds fields to every event
    const childLogger = new Logger(this.config);
    childLogger.corrId = this.corrId;
    childLogger.sessionId = this.sessionId;
    
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = async function(eventName, level, fields) {
      return originalLog(eventName, level, { ...fields, ...childLogger });
    } as any;

    return childLogger;
  }

  async flushSync(): Promise<void> {
    // Expose flush for unload handlers
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

// Singleton instance
let loggerInstance: Logger | null = null;

export function initLogger(config: LoggerConfig): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  }
  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger({
      env: typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ? 'production' : 'development',
    });
  }
  return loggerInstance;
}

// Auto-initialize in service worker
if (typeof self !== 'undefined' && 'serviceWorker' in self && self instanceof ServiceWorkerGlobalScope) {
  const sw = self as any;
  sw.addEventListener('install', () => {
    initLogger({
      env: 'production',
    });
  });
}

// Export default
export default { initLogger, getLogger };

