import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function getRequestId(req: VercelRequest): string {
  const headerId = req.headers['x-vercel-id'];
  if (typeof headerId === 'string' && headerId.length > 0) return headerId;
  return randomUUID();
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]): void {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Method not allowed' });
}
