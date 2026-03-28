import { Controller, Post, Patch, Get, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
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
        @Body() data: { clientId: string; planId: string; amountPaid: number; paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'YAPE_PLIN'; receiptUrl?: string; startDate?: string; endDate?: string; mode?: 'replace' | 'queue' },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.assign({ ...data, createdBy: user.id });
    }

    @Patch(':id/freeze')
    @Roles('ADMIN', 'OWNER')
    freeze(@Param('id') id: string, @Body() data?: { autoUnfreezeDate?: string }) {
        return this.service.freeze(id, data?.autoUnfreezeDate);
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

    @Delete(':id')
    @Roles('ADMIN', 'OWNER')
    delete(@Param('id') id: string) {
        return this.service.delete(id);
    }

    @Post(':id/payments')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    addPayment(
        @Param('id') id: string,
        @Body() data: { amountPaid: number; paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'YAPE_PLIN'; receiptUrl?: string },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.addPayment(id, { ...data, createdBy: user.id });
    }

    @Get(':id/payments')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getPayments(@Param('id') id: string) {
        return this.service.getPayments(id);
    }

    @Post('daily-pass')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    assignDailyPass(
        @Body() data: { clientId: string; amountPaid: number; paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'YAPE_PLIN'; receiptUrl?: string },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.assignDailyPass({ ...data, createdBy: user.id });
    }

    @Get('expiring')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getExpiring(@Query('days') days?: number) {
        return this.service.getExpiring(days);
    }
}
