import { Controller, Post, Patch, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Memberships')
@Controller('memberships')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class MembershipsController {
    constructor(private service: MembershipsService) { }

    @Post()
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    assign(
        @Body() data: { clientId: string; planId: string; amountPaid: number; startDate?: string; mode?: 'replace' | 'queue' },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.assign({ ...data, createdBy: user.id });
    }

    @Patch(':id/freeze')
    @Roles('ADMIN', 'OWNER')
    freeze(@Param('id') id: string) {
        return this.service.freeze(id);
    }

    @Patch(':id/unfreeze')
    @Roles('ADMIN', 'OWNER')
    unfreeze(@Param('id') id: string) {
        return this.service.unfreeze(id);
    }

    @Patch(':id/cancel')
    @Roles('ADMIN', 'OWNER')
    cancel(@Param('id') id: string) {
        return this.service.cancel(id);
    }

    @Get('expiring')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getExpiring(@Query('days') days?: number) {
        return this.service.getExpiring(days);
    }
}
