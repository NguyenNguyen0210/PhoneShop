import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { IdempotencyService } from './idempotency.service';
import { Request } from 'express';

// ── H10: IDEMPOTENCY (wired, not dead code) ─────────────────────
// Header name matches CORS `Idempotency-Key` in main.ts (Node lowercases
// header names, so we read `idempotency-key`). Replays are scoped to
// (key, user, endpoint, body-hash): a key presented with a different payload
// or by a different user is rejected instead of returning someone else's
// response. Expired records are treated as a miss. A failed first attempt
// leaves a *pending* record; retries within the short in-progress window get
// 409, while stale pending records (> STALE_PENDING_MS, e.g. crashed first
// attempt) are discarded so checkout is never blocked forever.
const IDEMPOTENCY_HEADER = 'idempotency-key';
const MAX_KEY_LENGTH = 255;
const STALE_PENDING_MS = 60_000;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers[IDEMPOTENCY_HEADER] as string | undefined;

    // Opt-in: no key, no idempotency. Only POST is covered.
    if (request.method !== 'POST' || !rawKey) {
      return next.handle();
    }
    const key = rawKey.trim();
    if (key.length === 0 || key.length > MAX_KEY_LENGTH) {
      throw new BadRequestException('Invalid Idempotency-Key header');
    }

    const userId = (request.user as any)?.id || null;
    const endpoint = request.originalUrl.split('?')[0];
    const requestHash = createHash('sha256')
      .update(JSON.stringify(request.body ?? {}))
      .digest('hex');

    const existing = await this.idempotencyService.getRecord(key);
    if (existing) {
      const expired = new Date(existing.expiresAt).getTime() <= Date.now();
      const sameOwner =
        (existing.userId || null) === userId && existing.endpoint === endpoint;
      if (expired || !sameOwner || existing.requestHash !== requestHash) {
        // Expired keys are dead; a key with a different owner/endpoint/body
        // must never replay another request's response.
        if (expired || !sameOwner) {
          await this.idempotencyService.deleteRecord(key);
        } else {
          throw new HttpException(
            'Idempotency key already used with a different payload',
            HttpStatus.CONFLICT,
          );
        }
      } else if (existing.responseBody) {
        return of(existing.responseBody);
      } else {
        const ageMs = Date.now() - new Date(existing.createdAt).getTime();
        if (ageMs <= STALE_PENDING_MS) {
          throw new HttpException('Request already in progress', HttpStatus.CONFLICT);
        }
        // Stale pending (first attempt crashed before responding) — discard
        // so the retry can execute instead of 409-ing forever.
        await this.idempotencyService.deleteRecord(key);
      }
    }

    // Race-safe create: two concurrent same-key requests — the loser gets a
    // unique violation and falls back to reading the winner's record.
    try {
      await this.idempotencyService.createRecord(key, userId, endpoint, requestHash);
    } catch {
      const raced = await this.idempotencyService.getRecord(key);
      if (raced?.responseBody) return of(raced.responseBody);
      throw new HttpException('Request already in progress', HttpStatus.CONFLICT);
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.idempotencyService.updateRecord(key, HttpStatus.OK, response);
        } catch {
          // Non-fatal: the order/payment already succeeded; a missing cache
          // entry only means the next retry re-executes (same as no key).
        }
      }),
    );
  }
}
