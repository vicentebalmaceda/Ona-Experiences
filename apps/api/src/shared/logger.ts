import { env } from '../config/env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const SENSITIVE_KEYS = new Set([
  'accesstoken',
  'access_token',
  'authorization',
  'password',
  'token',
  'bsale_access_token'
]);

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[env.LOG_LEVEL];
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return '[REDACTED]';
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return redactMeta(value as Record<string, unknown>);
  }
  return value;
}

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    result[key] = redactValue(key, value);
  }
  return result;
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  return ` ${JSON.stringify(redactMeta(meta))}`;
}

function write(level: LogLevel, context: string, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${level.toUpperCase()} [${context}] ${message}${formatMeta(meta)}`;

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(context: string) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) => write('debug', context, message, meta),
    info: (message: string, meta?: Record<string, unknown>) => write('info', context, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => write('warn', context, message, meta),
    error: (message: string, meta?: Record<string, unknown>) => write('error', context, message, meta)
  };
}

/** Default logger for modules without a dedicated context. */
export const logger = createLogger('api');
