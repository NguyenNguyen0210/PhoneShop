import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { safeRequestPath } from '../utils/safe-request-path';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestPath = safeRequestPath(request);

    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObject = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        message = responseObject.message ?? message;
        error = responseObject.error ?? error;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled ${exception.name} at ${request.method} ${requestPath}`);
      if (process.env.NODE_ENV !== 'production') this.logger.debug(exception.stack);
    } else {
      this.logger.error(
        `Unhandled Exception at ${request.method} ${requestPath}`,
      );
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR && exception instanceof HttpException) {
      this.logger.error(
        `HTTP ${statusCode} at ${request.method} ${requestPath}`,
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error,
      path: requestPath,
      timestamp,
    });
  }
}
