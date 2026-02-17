import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipPlansService } from './membership-plans.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Membership Plans')
@Controller('membership-plans')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class MembershipPlansController {
    constructor(private service: MembershipPlansService) { }

    @Get()
    findAll(@Query('activeOnly') activeOnly?: boolean) {
        return this.service.findAll(activeOnly);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @Roles('ADMIN', 'OWNER')
    create(@Body() data: { name: string; price: number; durationDays: number; description?: string }) {
        return this.service.create(data);
    }

    @Patch(':id')
    @Roles('ADMIN', 'OWNER')
    update(@Param('id') id: string, @Body() data: { name?: string; price?: number; durationDays?: number; description?: string; isActive?: boolean }) {
        return this.service.update(id, data);
    }

    @Delete(':id')
    @Roles('ADMIN', 'OWNER')
    delete(@Param('id') id: string) {
        return this.service.delete(id);
    }
}
