import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RagService } from './rag.service';

@ApiTags('RAG Admin')
@Controller('admin/rag')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RagAdminController {
  constructor(private readonly ragService: RagService) {}

  @Post('reindex')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Backfill vector index cho products + FAQ' })
  reindex() {
    return this.ragService.reindexAll();
  }
}
