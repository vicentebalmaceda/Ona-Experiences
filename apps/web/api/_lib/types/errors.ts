export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class BsaleApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'BsaleApiError';
  }
}

export interface ValidationIssue {
  path: string;
  message: string;
}

/**
 * Carries the exact 400 payload the Express API returned for Zod failures,
 * so the serverless error handler can reproduce the contract byte-for-byte.
 */
export class ValidationError extends Error {
  constructor(
    public readonly payload: { error: string; code?: string; details: ValidationIssue[] }
  ) {
    super(payload.error);
    this.name = 'ValidationError';
  }
}
