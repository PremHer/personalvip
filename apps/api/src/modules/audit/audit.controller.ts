import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Audit')
@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'OWNER')
@ApiBearerAuth()
export class AuditController {
    constructor(private service: AuditService) { }

    @Get()
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('userId') userId?: string,
        @Query('entityType') entityType?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('action') action?: string,
    ) {
        return this.service.findAll({ page, limit, userId, entityType, dateFrom, dateTo, action });
    }
}
