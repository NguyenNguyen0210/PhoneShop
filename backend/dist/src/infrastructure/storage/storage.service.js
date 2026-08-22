"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
let StorageService = StorageService_1 = class StorageService {
    config;
    logger = new common_1.Logger(StorageService_1.name);
    supabase;
    bucket;
    isMock;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const url = this.config.get('SUPABASE_URL');
        const key = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
        this.bucket = this.config.get('SUPABASE_STORAGE_BUCKET', 'mobile-commerce');
        this.isMock = !url || !key || key === 'your-supabase-service-role-key';
        if (this.isMock) {
            this.logger.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured. ' +
                'Running in mock mode — storage calls will return placeholder URLs.');
            return;
        }
        this.supabase = (0, supabase_js_1.createClient)(url, key);
        this.logger.log(`Supabase Storage initialized (bucket=${this.bucket})`);
    }
    async uploadFile(buffer, fileName, folder = 'uploads', mimeType = 'application/octet-stream') {
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
            throw new common_1.InternalServerErrorException(`File upload failed: ${error.message}`);
        }
        const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
        this.logger.log(`File uploaded: ${data.publicUrl}`);
        return { url: data.publicUrl, path };
    }
    async uploadProductImage(buffer, fileName) {
        return this.uploadFile(buffer, fileName, 'products', 'image/jpeg');
    }
    async uploadAvatarImage(buffer, fileName) {
        return this.uploadFile(buffer, fileName, 'avatars', 'image/jpeg');
    }
    async uploadBrandLogo(buffer, fileName) {
        return this.uploadFile(buffer, fileName, 'brands', 'image/png');
    }
    async uploadCategoryImage(buffer, fileName) {
        return this.uploadFile(buffer, fileName, 'categories', 'image/jpeg');
    }
    async deleteFile(path) {
        if (this.isMock) {
            this.logger.log(`[STORAGE MOCK] Deleting: ${path}`);
            return;
        }
        const { error } = await this.supabase.storage.from(this.bucket).remove([path]);
        if (error) {
            this.logger.error(`Delete failed: ${path}`, error.message);
            throw new common_1.InternalServerErrorException(`File delete failed: ${error.message}`);
        }
        this.logger.log(`File deleted: ${path}`);
    }
    getPublicUrl(path) {
        if (this.isMock) {
            return `https://placeholder.supabase.co/storage/v1/object/public/${this.bucket}/${path}`;
        }
        const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
        return data.publicUrl;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map