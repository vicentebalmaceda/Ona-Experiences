import type { VercelRequest } from '@vercel/node';
import type { ZodType, ZodTypeDef } from 'zod';
import { ZodError } from 'zod';
import { ValidationError, type ValidationIssue } from '../types/errors.js';

type Schema<T> = ZodType<T, ZodTypeDef, unknown>;

function toIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message
  }));
}

function parseOrThrow<T>(
  schema: Schema<T>,
  input: unknown,
  payloadBase: { error: string; code?: string }
): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError({ ...payloadBase, details: toIssues(error) });
    }
    throw error;
  }
}

export function validateQuery<T>(schema: Schema<T>, req: VercelRequest): T {
  return parseOrThrow(schema, req.query, { error: 'Invalid query parameters' });
}

/**
 * Path parameters arrive merged into req.query by Vercel's file-based
 * routing ([productId] segments), so both validators read the same source.
 */
export function validateParams<T>(schema: Schema<T>, req: VercelRequest): T {
  return parseOrThrow(schema, req.query, { error: 'Invalid path parameters' });
}

export function validateBody<T>(schema: Schema<T>, req: VercelRequest): T {
  return parseOrThrow(schema, req.body, {
    error: 'Invalid request body',
    code: 'VALIDATION_ERROR'
  });
}
