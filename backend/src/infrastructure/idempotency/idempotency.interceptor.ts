import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';
import { Request } from 'express';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    if (!idempotencyKey) {
      // If no idempotency key is provided, just proceed
      return next.handle();
    }

    const userId = (request.user as any)?.id || null;
    const endpoint = request.originalUrl;
    
    // Check if idempotency key exists
    const existingRecord = await this.idempotencyService.getRecord(idempotencyKey);
    
    if (existingRecord) {
      // Return cached response
      if (existingRecord.responseBody) {
        return of(existingRecord.responseBody);
      }
      throw new HttpException('Request already in progress', HttpStatus.CONFLICT);
    }

    // Save initial record (pending)
    await this.idempotencyService.createRecord(idempotencyKey, userId, endpoint);

    return next.handle().pipe(
      tap(async (response) => {
        // Save the successful response
        await this.idempotencyService.updateRecord(idempotencyKey, HttpStatus.OK, response);
      }),
    );
  }
}
