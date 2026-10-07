import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmbeddingService } from './embedding.service';
import { RagService } from './rag.service';
import { RagAdminController } from './rag-admin.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [RagAdminController],
  providers: [EmbeddingService, RagService],
  exports: [EmbeddingService, RagService],
})
export class RagModule {}
