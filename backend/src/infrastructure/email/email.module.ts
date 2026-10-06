import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { BrevoService } from './brevo.service';

@Global()
@Module({
  providers: [EmailService, BrevoService],
  exports: [EmailService, BrevoService],
})
export class EmailModule {}
