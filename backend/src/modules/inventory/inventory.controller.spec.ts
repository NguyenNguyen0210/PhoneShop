import 'reflect-metadata';
import { describe, it, expect, jest } from '@jest/globals';
import { BadRequestException, ParseIntPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { InventoryController } from './inventory.controller';

describe('InventoryController - threshold query (D1)', () => {
  it('has ParseIntPipe wired to the threshold query param (route metadata)', () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      InventoryController,
      'getLowStock',
    ) as Record<string, any>;
    const thresholdArg = Object.values(args).find(
      (a: any) => a.index === 0 && a.data === 'threshold',
    );
    expect(thresholdArg).toBeDefined();
    const pipes: any[] = (thresholdArg as any).pipes ?? [];
    expect(pipes.some((p) => p instanceof ParseIntPipe)).toBe(true);
  });

  it('converts ?threshold=5 into a number via ParseIntPipe so the endpoint no longer 500s', async () => {
    const pipe = new ParseIntPipe({ optional: true });
    expect(await pipe.transform('5', {} as any)).toBe(5);
    expect(await pipe.transform('0', {} as any)).toBe(0);
  });

  it('leaves the parameter undefined when the query is omitted (optional)', async () => {
    const pipe = new ParseIntPipe({ optional: true });
    expect(await pipe.transform(undefined as any, {} as any)).toBeUndefined();
  });

  it('rejects non-numeric threshold with 400 instead of a Prisma 500', async () => {
    const pipe = new ParseIntPipe({ optional: true });
    await expect(pipe.transform('abc', {} as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('forwards the numeric threshold to the service', async () => {
    const getLowStockAlerts = jest.fn();
    (getLowStockAlerts as any).mockResolvedValue([]);
    const service: any = { getLowStockAlerts };
    const controller = new InventoryController(service as any);

    await controller.getLowStock(5);

    expect(service.getLowStockAlerts).toHaveBeenCalledWith(5);
    expect(typeof service.getLowStockAlerts.mock.calls[0][0]).toBe('number');
  });
});
