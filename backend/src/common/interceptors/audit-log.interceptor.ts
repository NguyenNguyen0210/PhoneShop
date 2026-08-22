import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    
    // Only log modifying actions for now
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(async () => {
          try {
            const user = request.user;
            if (user) {
              await this.prisma.auditLog.create({
                data: {
                  action: 'OTHER', // Need detailed mapping logic in real scenario
                  entity: url.split('/')[1] || 'UNKNOWN',
                  userId: user.id,
                  ipAddress: request.ip,
                  userAgent: request.headers['user-agent'],
                  newData: request.body, // In real app, be careful about sensitive data
                },
              });
            }
          } catch (error) {
            console.error('Failed to write audit log:', error);
          }
        }),
      );
    }

    return next.handle();
  }
}
