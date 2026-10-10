import type { IncomingMessage } from 'node:http';
import { del, head } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { DomainError } from '../../types/errors.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('blob');

export interface BlobMetadata {
  url: string;
  pathname: string;
  contentType: string;
  sizeBytes: number;
}

export interface ClientTokenRules {
  allowedContentTypes: readonly string[];
  maximumSizeInBytes: number;
  /** Opaque string handed back to onUploadCompleted; we only log it. */
  tokenPayload?: string;
}

export interface BlobStorage {
  readonly configured: boolean;
  /** Metadata for a blob in our store, or null when it does not exist. */
  head(pathname: string): Promise<BlobMetadata | null>;
  delete(pathname: string): Promise<void>;
  /**
   * Runs the Vercel Blob client-upload protocol for one request. `decide` is
   * called with the pathname and client payload the browser proposed and must
   * return the constraints for the token or throw a DomainError.
   */
  handleClientUpload(
    request: IncomingMessage,
    body: HandleUploadBody,
    decide: (pathname: string, clientPayload: string | null) => Promise<ClientTokenRules>
  ): Promise<unknown>;
}

/** Thin adapter over @vercel/blob so the service stays testable with a fake. */
export class VercelBlobStorage implements BlobStorage {
  readonly configured = true;

  constructor(private readonly token: string) {}

  async head(pathname: string): Promise<BlobMetadata | null> {
    try {
      const meta = await head(pathname, { token: this.token });
      return {
        url: meta.url,
        pathname: meta.pathname,
        contentType: meta.contentType,
        sizeBytes: meta.size
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(pathname: string): Promise<void> {
    try {
      await del(pathname, { token: this.token });
    } catch (error) {
      // A missing blob is already the state we want.
      if (!isNotFound(error)) throw error;
    }
  }

  async handleClientUpload(
    request: IncomingMessage,
    body: HandleUploadBody,
    decide: (pathname: string, clientPayload: string | null) => Promise<ClientTokenRules>
  ): Promise<unknown> {
    return handleUpload({
      request,
      body,
      token: this.token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const rules = await decide(pathname, clientPayload);
        return {
          allowedContentTypes: [...rules.allowedContentTypes],
          maximumSizeInBytes: rules.maximumSizeInBytes,
          addRandomSuffix: true,
          // Tokens are single-use in practice; keep the window short.
          validUntil: Date.now() + 15 * 60 * 1000,
          tokenPayload: rules.tokenPayload ?? null
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Publishing is an explicit admin step (PUT /admin/assets/:slot), so this
        // callback is informational. It never fires on localhost anyway.
        log.info('Blob client upload completed', { pathname: blob.pathname, tokenPayload });
      }
    });
  }
}

/** Used when BLOB_READ_WRITE_TOKEN is not set: reads work, writes explain why not. */
export class UnconfiguredBlobStorage implements BlobStorage {
  readonly configured = false;

  async head(): Promise<BlobMetadata | null> {
    throw notConfigured();
  }

  async delete(): Promise<void> {
    throw notConfigured();
  }

  async handleClientUpload(): Promise<unknown> {
    throw notConfigured();
  }
}

function notConfigured(): DomainError {
  return new DomainError(
    'File storage is not configured (BLOB_READ_WRITE_TOKEN missing)',
    503,
    'BLOB_NOT_CONFIGURED'
  );
}

function isNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = (error as { name?: string }).name ?? '';
  return name === 'BlobNotFoundError' || /not found/i.test(error.message);
}
