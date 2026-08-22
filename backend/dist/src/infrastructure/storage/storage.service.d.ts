import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface UploadResult {
    url: string;
    path: string;
}
export declare class StorageService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private supabase;
    private bucket;
    private isMock;
    constructor(config: ConfigService);
    onModuleInit(): void;
    uploadFile(buffer: Buffer, fileName: string, folder?: string, mimeType?: string): Promise<UploadResult>;
    uploadProductImage(buffer: Buffer, fileName: string): Promise<UploadResult>;
    uploadAvatarImage(buffer: Buffer, fileName: string): Promise<UploadResult>;
    uploadBrandLogo(buffer: Buffer, fileName: string): Promise<UploadResult>;
    uploadCategoryImage(buffer: Buffer, fileName: string): Promise<UploadResult>;
    deleteFile(path: string): Promise<void>;
    getPublicUrl(path: string): string;
}
