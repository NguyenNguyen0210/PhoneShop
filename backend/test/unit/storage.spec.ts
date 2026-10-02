import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import sharp from 'sharp';

describe('StorageService', () => {
  let service: StorageService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((key: string, defaultVal?: any) => {
        if (key === 'SUPABASE_URL') return 'https://mock.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'mock-key';
        if (key === 'SUPABASE_STORAGE_BUCKET') return 'mobile-commerce';
        return defaultVal;
      }),
    };

    service = new StorageService(mockConfig);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should compress and convert an image buffer to WebP', async () => {
    // Generate a test 100x100 PNG buffer
    const testPngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.optimizeImage(testPngBuffer, 800);
    expect(result.mimeType).toBe('image/webp');
    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify Sharp can inspect the resulting buffer as webp
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(800);
  });
});
