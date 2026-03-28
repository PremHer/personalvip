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
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getDashboard() {
        return this.service.getDashboard();
    }

    @Get('daily-report')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getDailyReport(@Query('date') date?: string) {
        return this.service.getDailyReport(date);
    }

    @Get('income-chart')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getIncomeChart(@Query('period') period?: 'week' | 'month' | 'year') {
        return this.service.getIncomeChart(period);
    }

    @Get('sales-report')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getSalesReport(@Query('from') from?: string, @Query('to') to?: string) {
        return this.service.getSalesReport(from, to);
    }

    @Get('receptionist-income')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getReceptionistIncome(
        @Query('cashierId') cashierId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('period') period?: 'today' | 'week' | 'month' | 'year' | 'all',
        @CurrentUser() user?: { id: string; role: string },
    ) {
        // If current user is just a RECEPTIONIST, they can only see their own income
        const targetCashierId = user?.role === 'RECEPTIONIST' ? user.id : cashierId;
        return this.service.getReceptionistIncome({
            cashierId: targetCashierId,
            from,
            to,
            period,
        });
    }

    @Get('metrics')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getMetrics(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('period') period?: 'today' | 'week' | 'month' | 'year' | 'all'
    ) {
        return this.service.getMetrics({ from, to, period });
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
