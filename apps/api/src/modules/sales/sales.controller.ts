import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class SalesController {
    constructor(private service: SalesService) { }

    @Post()
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    create(
        @Body() data: {
            clientId?: string;
            items: { productId: string; quantity: number }[];
            paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
            discount?: number;
        },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.create({ ...data, cashierId: user.id });
    }

    @Get()
    @Roles('ADMIN', 'OWNER')
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.service.findAll(page, limit, dateFrom, dateTo);
    }

    @Get(':id')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }
}
