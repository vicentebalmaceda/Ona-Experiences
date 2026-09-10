import { createHash, timingSafeEqual } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';
import { DomainError } from '../types/errors.js';

export function requireAdmin(req: VercelRequest, secret: string): void {
  const header = req.headers.authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
  const received = createHash('sha256').update(token).digest();
  const expected = createHash('sha256').update(secret).digest();
  if (!timingSafeEqual(received, expected)) {
    throw new DomainError('Unauthorized', 401, 'UNAUTHORIZED');
  }
}
