import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { safeRequestPath } from '../utils/safe-request-path';

/**
 * Standard HTTP request/response logger using NestJS built-in Logger.
 * Logs method, URL, status code, and duration without external telemetry dependencies.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method } = req;
    const requestPath = safeRequestPath(req);
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const statusCode = res.statusCode;
          this.logger.log(`${method} ${requestPath} ${statusCode} +${duration}ms`);
        },
        error: (err) => {
          const duration = Date.now() - start;
          const statusCode = err?.status || err?.statusCode || 500;
          this.logger.warn(
            `${method} ${requestPath} ${statusCode} +${duration}ms`,
          );
        },
      }),
    );
  }
}
