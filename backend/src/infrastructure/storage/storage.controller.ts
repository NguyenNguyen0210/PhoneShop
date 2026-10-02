import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { StorageService, UploadResult } from './storage.service';
import { DeleteFileDto } from './dto/upload-response.dto';

export const ALLOWED_IMAGE_REGEX = /(jpg|jpeg|png|webp)$/i;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload single image for products, brands, or categories (Admin/Staff only)
   */
  @Post('upload/:folder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @Param('folder') folder: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_IMAGE_REGEX }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    const validFolders = ['products', 'brands', 'categories'];
    if (!validFolders.includes(folder)) {
      throw new BadRequestException(`Folder must be one of: ${validFolders.join(', ')}`);
    }

    return this.storageService.uploadFile(file.buffer, file.originalname, folder, true);
  }

  /**
   * Upload up to 5 images simultaneously for product variant gallery
   */
  @Post('upload-gallery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadGallery(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }

    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException(`File ${file.originalname} exceeds 5MB limit`);
      }
      if (!file.mimetype || !ALLOWED_IMAGE_REGEX.test(file.mimetype)) {
        throw new BadRequestException(
          `File ${file.originalname} has an invalid type. Only JPG, JPEG, PNG, and WebP are allowed`,
        );
      }
    }

    const uploadPromises = files.map((file) => {
      return this.storageService.uploadFile(file.buffer, file.originalname, 'products/gallery', true);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Upload user avatar (available to any authenticated user)
   */
  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_IMAGE_REGEX }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.storageService.uploadFile(file.buffer, file.originalname, 'avatars', true);
  }

  /**
   * Delete asset from Supabase storage by path
   */
  @Delete('delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async deleteFile(@Body() dto: DeleteFileDto): Promise<{ success: boolean; message: string }> {
    if (!dto.path) {
      throw new BadRequestException('File path is required');
    }

    await this.storageService.deleteFile(dto.path);
    return { success: true, message: `File ${dto.path} deleted successfully` };
  }
}
