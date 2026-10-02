import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  private supabase: SupabaseClient;
  private bucket: string;
  private isMock: boolean;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET', 'mobile-commerce');

    this.isMock = !url || !key || key.includes('your-supabase');

    if (this.isMock) {
      this.logger.warn(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured. ' +
          'Running in mock mode — storage calls will return placeholder URLs.',
      );
      return;
    }

    this.supabase = createClient(url!, key!);
    this.logger.log(`Supabase Storage initialized (bucket=${this.bucket})`);
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
   * Upload file to Supabase storage with automatic WebP optimization.
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    folder = 'uploads',
    shouldOptimize = true,
  ): Promise<UploadResult> {
    let finalBuffer = buffer;
    let mimeType = 'image/webp';
    let ext = 'webp';

    if (shouldOptimize) {
      const opt = await this.optimizeImage(buffer);
      finalBuffer = opt.buffer;
      mimeType = opt.mimeType;
      ext = opt.format;
    }

    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `${folder}/${Date.now()}-${baseName}.${ext}`;

    if (this.isMock) {
      this.logger.log(`[STORAGE MOCK] Uploading: ${path} (${mimeType}, ${finalBuffer.length} bytes)`);
      return {
        url: `https://placeholder.supabase.co/storage/v1/object/public/${this.bucket}/${path}`,
        path,
      };
    }

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, finalBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload failed: ${path}`, error.message);
      throw new InternalServerErrorException(`File upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
    this.logger.log(`File uploaded to Supabase: ${data.publicUrl}`);

    return { url: data.publicUrl, path };
  }

  /**
   * Delete asset from Supabase storage by path.
   */
  async deleteFile(path: string): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[STORAGE MOCK] Deleting: ${path}`);
      return;
    }

    const { error } = await this.supabase.storage.from(this.bucket).remove([path]);
    if (error) {
      this.logger.error(`Delete failed: ${path}`, error.message);
      throw new InternalServerErrorException(`File delete failed: ${error.message}`);
    }
    this.logger.log(`File deleted from Supabase: ${path}`);
  }
}
