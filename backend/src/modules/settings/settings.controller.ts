import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { SystemSettingsService } from './settings.service';
import {
  UpdateSettingsBatchDto,
  TestStorageDto,
  TestEmailDto,
  TestVietQrDto,
} from './dto/settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get('settings/public')
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminSettings() {
    return this.settingsService.getAllGrouped(true);
  }

  @Patch('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateAdminSettings(@Body() dto: UpdateSettingsBatchDto, @Req() req: any) {
    if (!dto.settings || !Array.isArray(dto.settings)) {
      throw new BadRequestException('settings array is required');
    }
    await this.settingsService.updateBatch(dto.settings, req.user?.id);
    return { success: true, message: 'Cập nhật cấu hình thành công' };
  }

  @Post('admin/settings/test/vietqr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async testVietQr(@Body() dto: TestVietQrDto) {
    try {
      return await this.settingsService.testVietQr(dto);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Lỗi khi kiểm tra VietQR');
    }
  }

  @Post('admin/settings/test/storage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async testStorage(@Body() dto: TestStorageDto) {
    try {
      return await this.settingsService.testStorage(dto);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Lỗi kết nối Cloudflare R2');
    }
  }

  @Post('admin/settings/test/email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async testEmail(@Body() dto: TestEmailDto, @Req() req: any) {
    try {
      return await this.settingsService.testEmail(dto, req.user?.email);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Lỗi gửi email kiểm tra');
    }
  }
}
