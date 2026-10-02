import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import { StorageController, ALLOWED_IMAGE_REGEX } from '../../src/infrastructure/storage/storage.controller';
import { BadRequestException } from '@nestjs/common';
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

  it('should convert SVG to WebP instead of bypassing compression (Stored XSS prevention)', async () => {
    const svgBuffer = Buffer.from(
      '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="blue"/><script>alert("xss")</script></svg>',
    );

    const result = await service.optimizeImage(svgBuffer, 800);
    expect(result.mimeType).toBe('image/webp');
    expect(result.format).toBe('webp');

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('webp');
  });
});

describe('ALLOWED_IMAGE_REGEX', () => {
  it('should accept valid raster formats (jpg, jpeg, png, webp)', () => {
    expect(ALLOWED_IMAGE_REGEX.test('image/jpeg')).toBe(true);
    expect(ALLOWED_IMAGE_REGEX.test('image/jpg')).toBe(true);
    expect(ALLOWED_IMAGE_REGEX.test('image/png')).toBe(true);
    expect(ALLOWED_IMAGE_REGEX.test('image/webp')).toBe(true);
    expect(ALLOWED_IMAGE_REGEX.test('IMAGE/JPEG')).toBe(true);
    expect(ALLOWED_IMAGE_REGEX.test('IMAGE/PNG')).toBe(true);
  });

  it('should reject unsafe formats including SVG, GIF, PDF, HTML', () => {
    expect(ALLOWED_IMAGE_REGEX.test('image/svg+xml')).toBe(false);
    expect(ALLOWED_IMAGE_REGEX.test('image/svg')).toBe(false);
    expect(ALLOWED_IMAGE_REGEX.test('image/gif')).toBe(false);
    expect(ALLOWED_IMAGE_REGEX.test('application/pdf')).toBe(false);
    expect(ALLOWED_IMAGE_REGEX.test('text/html')).toBe(false);
  });
});

describe('StorageController - uploadGallery', () => {
  let controller: StorageController;
  let mockStorageService: any;

  beforeEach(() => {
    mockStorageService = {
      uploadFile: jest.fn(async (_buf: Buffer, name: string) => ({
        url: `https://mock.supabase.co/${name}`,
        path: `products/gallery/${name}`,
      })),
    };

    controller = new StorageController(mockStorageService);
  });

  it('should successfully upload valid gallery images', async () => {
    const mockFiles: any = [
      {
        originalname: 'img1.png',
        mimetype: 'image/png',
        size: 1024 * 1024,
        buffer: Buffer.from('fake-image-1'),
      },
      {
        originalname: 'img2.jpg',
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024,
        buffer: Buffer.from('fake-image-2'),
      },
    ];

    const results = await controller.uploadGallery(mockFiles);
    expect(results).toHaveLength(2);
    expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(2);
  });

  it('should throw BadRequestException if a file exceeds 5MB', async () => {
    const mockFiles: any = [
      {
        originalname: 'large.png',
        mimetype: 'image/png',
        size: 6 * 1024 * 1024, // 6MB
        buffer: Buffer.from('fake-image'),
      },
    ];

    await expect(controller.uploadGallery(mockFiles)).rejects.toThrow(BadRequestException);
    expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if a file is an SVG or disallowed format', async () => {
    const mockFiles: any = [
      {
        originalname: 'malicious.svg',
        mimetype: 'image/svg+xml',
        size: 1024,
        buffer: Buffer.from('<svg></svg>'),
      },
    ];

    await expect(controller.uploadGallery(mockFiles)).rejects.toThrow(BadRequestException);
    expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if files array is empty', async () => {
    await expect(controller.uploadGallery([])).rejects.toThrow(BadRequestException);
  });
});
