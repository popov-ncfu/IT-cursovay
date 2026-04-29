import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/jwt-payload.type';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditService } from './audit.service';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @UseGuards(JwtAuthGuard)
  @Get('audit')
  async list(@Query() query: AuditQueryDto, @Req() req: { user: AuthUser }) {
    // Access control: authenticated users can read their audit trail context.
    // RBAC can be expanded later if needed.
    void req.user;
    return this.auditService.list(query);
  }
}
