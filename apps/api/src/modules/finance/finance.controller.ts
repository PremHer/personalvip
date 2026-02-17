import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class FinanceController {
    constructor(private service: FinanceService) { }

    @Get('dashboard')
    @Roles('ADMIN', 'OWNER')
    getDashboard() {
        return this.service.getDashboard();
    }

    @Get('daily-report')
    @Roles('ADMIN', 'OWNER')
    getDailyReport(@Query('date') date?: string) {
        return this.service.getDailyReport(date);
    }

    @Get('income-chart')
    @Roles('ADMIN', 'OWNER')
    getIncomeChart(@Query('period') period?: 'week' | 'month' | 'year') {
        return this.service.getIncomeChart(period);
    }

    @Get('sales-report')
    @Roles('ADMIN', 'OWNER')
    getSalesReport(@Query('from') from?: string, @Query('to') to?: string) {
        return this.service.getSalesReport(from, to);
    }

    @Post('cash-register/open')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    openCashRegister(
        @Body() data: { openingAmount: number },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.openCashRegister(user.id, data.openingAmount);
    }

    @Patch('cash-register/:id/close')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    closeCashRegister(
        @Param('id') id: string,
        @Body() data: { closingAmount: number; notes?: string },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.closeCashRegister(id, user.id, data.closingAmount, data.notes);
    }
}
