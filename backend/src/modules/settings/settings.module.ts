import { Module, Global } from '@nestjs/common';
import { SystemSettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SettingsModule {}
