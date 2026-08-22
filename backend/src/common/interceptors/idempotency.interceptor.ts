import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ConflictException } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['x-idempotency-key'];

    if (request.method !== 'POST' || !idempotencyKey) {
      return next.handle();
    }

    const requestHash = crypto.createHash('sha256').update(JSON.stringify(request.body)).digest('hex');

    // Check if record exists
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });

    if (record) {
      if (record.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key used with different payload');
      }
      // Return previous response if successful
      return of(record.responseBody);
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24); // Keep for 24 hours

          await this.prisma.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              endpoint: request.url,
              requestHash,
              responseBody: response,
              expiresAt,
            },
          });
        } catch (error) {
          console.error('Failed to save idempotency record', error);
        }
      }),
    );
  }
}
