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

// Read straight from process.env (not config/env.ts) so logging works even
// when the full BSale configuration is missing or invalid.
function currentLevel(): LogLevel {
  const level = process.env.LOG_LEVEL;
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
    return level;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function isJsonOutput(): boolean {
  return process.env.NODE_ENV === 'production';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel()];
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

function write(
  level: LogLevel,
  context: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const redacted = meta && Object.keys(meta).length > 0 ? redactMeta(meta) : undefined;

  const line = isJsonOutput()
    ? JSON.stringify({ timestamp, level, context, message, ...redacted })
    : `[${timestamp}] ${level.toUpperCase()} [${context}] ${message}${redacted ? ` ${JSON.stringify(redacted)}` : ''}`;

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(baseMeta: Record<string, unknown>): Logger;
}

export function createLogger(context: string, baseMeta?: Record<string, unknown>): Logger {
  const merge = (meta?: Record<string, unknown>) =>
    baseMeta ? { ...baseMeta, ...meta } : meta;

  return {
    debug: (message, meta) => write('debug', context, message, merge(meta)),
    info: (message, meta) => write('info', context, message, merge(meta)),
    warn: (message, meta) => write('warn', context, message, merge(meta)),
    error: (message, meta) => write('error', context, message, merge(meta)),
    child: (extra) => createLogger(context, { ...baseMeta, ...extra })
  };
}
