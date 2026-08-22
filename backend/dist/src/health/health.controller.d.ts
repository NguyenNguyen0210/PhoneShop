import { HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private readonly health;
    private readonly prisma;
    constructor(health: HealthCheckService, prisma: PrismaService);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult<HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & HealthIndicatorResult, Partial<HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & HealthIndicatorResult> | undefined, Partial<HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & HealthIndicatorResult> | undefined>>;
    private checkDatabase;
}
