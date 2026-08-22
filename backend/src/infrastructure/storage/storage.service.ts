import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UploadResult {
  url: string;
  path: string;
}

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

    this.isMock = !url || !key || key === 'your-supabase-service-role-key';

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

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    folder: string = 'uploads',
    mimeType: string = 'application/octet-stream',
  ): Promise<UploadResult> {
    const path = `${folder}/${Date.now()}-${fileName}`;

    if (this.isMock) {
      this.logger.log(`[STORAGE MOCK] Uploading: ${path} (${mimeType}, ${buffer.length} bytes)`);
      return {
        url: `https://${this.config.get('SUPABASE_URL', 'placeholder.supabase.co')}/storage/v1/object/public/${this.bucket}/${path}`,
        path,
      };
    }

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload failed: ${path}`, error.message);
      throw new InternalServerErrorException(`File upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
    this.logger.log(`File uploaded: ${data.publicUrl}`);

    return { url: data.publicUrl, path };
  }

  async uploadProductImage(buffer: Buffer, fileName: string): Promise<UploadResult> {
    return this.uploadFile(buffer, fileName, 'products', 'image/jpeg');
  }

  async uploadAvatarImage(buffer: Buffer, fileName: string): Promise<UploadResult> {
    return this.uploadFile(buffer, fileName, 'avatars', 'image/jpeg');
  }

  async uploadBrandLogo(buffer: Buffer, fileName: string): Promise<UploadResult> {
    return this.uploadFile(buffer, fileName, 'brands', 'image/png');
  }

  async uploadCategoryImage(buffer: Buffer, fileName: string): Promise<UploadResult> {
    return this.uploadFile(buffer, fileName, 'categories', 'image/jpeg');
  }

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
    this.logger.log(`File deleted: ${path}`);
  }

  getPublicUrl(path: string): string {
    if (this.isMock) {
      return `https://placeholder.supabase.co/storage/v1/object/public/${this.bucket}/${path}`;
    }
    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
