import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

export interface UploadResult {
  url: string;
  path: string;
}

export interface OptimizedImageResult {
  buffer: Buffer;
  mimeType: string;
  format: string;
}

export const ALLOWED_IMAGE_REGEX = /(jpg|jpeg|png|webp)$/i;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;
  private accountId: string;
  private isMock: boolean;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.accountId = this.config.get<string>('CLOUDFLARE_R2_ACCOUNT_ID')!;
    this.bucket = this.config.get<string>('CLOUDFLARE_R2_BUCKET')!;
    const accessKeyId = this.config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    this.publicUrl = this.config.get<string>('CLOUDFLARE_R2_PUBLIC_URL')!;

    this.isMock =
      !this.accountId || !this.bucket || !accessKeyId || !secretAccessKey || !this.publicUrl;

    if (this.isMock) {
      this.logger.warn(
        'CLOUDFLARE_R2_* vars not configured. ' +
          'Storage uploads will fail fast — configure R2 instead of returning fake URLs.',
      );
      return;
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://' + this.accountId + '.r2.cloudflarestorage.com',
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
    this.logger.log(`R2 Storage initialized (bucket=${this.bucket})`);
  }

  /**
   * Optimize image buffer: resize large images down to maxWidth and convert to WebP format.
   */
  async optimizeImage(
    buffer: Buffer,
    maxWidth = 1600,
    quality = 80,
  ): Promise<OptimizedImageResult> {
    try {
      const pipeline = sharp(buffer);
      const metadata = await pipeline.metadata();

      if (!metadata.format) {
        throw new BadRequestException('Invalid image buffer');
      }

      // M15: magic-byte check — the real format comes from parsing the bytes,
      // not the client-supplied mimetype. SVG/active content is rejected even
      // though sharp could rasterize it; output below is always plain WebP.
      const ALLOWED_INPUT_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'gif'];
      if (!ALLOWED_INPUT_FORMATS.includes(metadata.format)) {
        throw new BadRequestException(
          `Unsupported image format: ${metadata.format}. Allowed: JPG, PNG, WebP, AVIF, GIF.`,
        );
      }

      const optimized = await pipeline
        .resize({
          width: maxWidth,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality })
        .toBuffer();

      return {
        buffer: optimized,
        mimeType: 'image/webp',
        format: 'webp',
      };
    } catch (err: any) {
      this.logger.error(`Sharp optimization failed: ${err.message}`);
      throw new BadRequestException(`Cannot process image file: ${err.message}`);
    }
  }

  /**
   * Upload file to Cloudflare R2 storage with automatic WebP optimization.
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    folder = 'uploads',
    shouldOptimize = true,
  ): Promise<UploadResult> {
    let finalBuffer = buffer;
    let mimeType = 'image/webp';

    if (shouldOptimize) {
      const opt = await this.optimizeImage(buffer);
      finalBuffer = opt.buffer;
      mimeType = opt.mimeType;
    }

    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `${folder}/${Date.now()}-${baseName}.webp`;

    if (this.isMock) {
      throw new InternalServerErrorException(
        'Storage is not configured (missing CLOUDFLARE_R2_* vars). Upload rejected to avoid fake placeholder URLs.',
      );
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: finalBuffer,
          ContentType: mimeType,
        }),
      );
    } catch (err: any) {
      this.logger.error(`Upload failed: ${path}`, err?.message);
      throw new InternalServerErrorException(`File upload failed: ${err?.message}`);
    }

    const url = `${this.publicUrl}/${path}`;
    this.logger.log(`File uploaded to R2: ${url}`);

    return { url, path };
  }

  /**
   * Delete asset from Cloudflare R2 storage by path.
   */
  async deleteFile(path: string): Promise<void> {
    if (this.isMock) {
      throw new InternalServerErrorException(
        'Storage is not configured (missing CLOUDFLARE_R2_* vars). Delete rejected.',
      );
    }

    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }));
    } catch (err: any) {
      this.logger.error(`Delete failed: ${path}`, err?.message);
      throw new InternalServerErrorException(`File delete failed: ${err?.message}`);
    }
    this.logger.log(`File deleted from R2: ${path}`);
  }
}
