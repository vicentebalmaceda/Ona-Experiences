import type { VercelRequest } from '@vercel/node';
import { guideItemHandler, lodgeItemHandler } from './handlers/catalogItem.js';
import { guideListHandler, lodgeListHandler } from './handlers/catalogList.js';
import { guideReviewsHandler, lodgeReviewsHandler } from './handlers/catalogReviews.js';
import { guideSalesHandler, lodgeSalesHandler } from './handlers/catalogSales.js';
import { contactHandler } from './handlers/contact.js';
import { reviewByIdHandler } from './handlers/reviewById.js';
import { reviewInviteByTokenHandler } from './handlers/reviewInviteByToken.js';
import { reviewInvitesHandler } from './handlers/reviewInvites.js';
import { reviewsHandler } from './handlers/reviews.js';
import type { ApiHandler } from './middleware/withErrorHandler.js';

export interface V1Match {
  handler: ApiHandler;
  params: Record<string, string>;
}

interface Route {
  pattern: RegExp;
  paramNames: string[];
  handler: ApiHandler;
}

const routes: Route[] = [
  {
    pattern: /^\/api\/v1\/lodges$/,
    paramNames: [],
    handler: lodgeListHandler
  },
  {
    pattern: /^\/api\/v1\/lodges\/([^/]+)\/reviews$/,
    paramNames: ['productId'],
    handler: lodgeReviewsHandler
  },
  {
    pattern: /^\/api\/v1\/lodges\/([^/]+)\/sales$/,
    paramNames: ['productId'],
    handler: lodgeSalesHandler
  },
  {
    pattern: /^\/api\/v1\/lodges\/([^/]+)$/,
    paramNames: ['productId'],
    handler: lodgeItemHandler
  },
  {
    pattern: /^\/api\/v1\/guides$/,
    paramNames: [],
    handler: guideListHandler
  },
  {
    pattern: /^\/api\/v1\/guides\/([^/]+)\/reviews$/,
    paramNames: ['productId'],
    handler: guideReviewsHandler
  },
  {
    pattern: /^\/api\/v1\/guides\/([^/]+)\/sales$/,
    paramNames: ['productId'],
    handler: guideSalesHandler
  },
  {
    pattern: /^\/api\/v1\/guides\/([^/]+)$/,
    paramNames: ['productId'],
    handler: guideItemHandler
  },
  {
    pattern: /^\/api\/v1\/contact$/,
    paramNames: [],
    handler: contactHandler
  },
  {
    pattern: /^\/api\/v1\/review-invites$/,
    paramNames: [],
    handler: reviewInvitesHandler
  },
  {
    pattern: /^\/api\/v1\/review-invites\/([^/]+)$/,
    paramNames: ['token'],
    handler: reviewInviteByTokenHandler
  },
  {
    pattern: /^\/api\/v1\/reviews$/,
    paramNames: [],
    handler: reviewsHandler
  },
  {
    pattern: /^\/api\/v1\/reviews\/([^/]+)$/,
    paramNames: ['reviewId'],
    handler: reviewByIdHandler
  }
];

export function matchV1Route(pathname: string): V1Match | null {
  const route = routes.find((candidate) => candidate.pattern.test(pathname));
  if (!route) return null;

  const match = pathname.match(route.pattern);
  if (!match) return null;

  const params: Record<string, string> = {};
  route.paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1]);
  });

  return { handler: route.handler, params };
}

/**
 * Resolve the public /api/v1 pathname for the entry function.
 * Prefer a nested path on `req.url` (rewrites often preserve it). If the URL is
 * only `/api/v1`, fall back to a `path` query (rewrite `?path=$1` or legacy catch-all).
 */
export function pathnameFromV1Request(
  url: string | undefined,
  pathQuery?: string | string[]
): string {
  const fromUrl = new URL(url ?? '/', 'http://localhost').pathname;
  if (fromUrl.startsWith('/api/v1/')) {
    return fromUrl;
  }

  if (pathQuery !== undefined) {
    const segments = Array.isArray(pathQuery)
      ? pathQuery.filter(Boolean)
      : pathQuery.split('/').filter(Boolean);
    if (segments.length > 0) {
      return `/api/v1/${segments.join('/')}`;
    }
  }

  return fromUrl;
}

export function mergeV1Query(
  query: VercelRequest['query'],
  params: Record<string, string>
): VercelRequest['query'] {
  const { path: _path, ...rest } = query;
  return { ...rest, ...params };
}
