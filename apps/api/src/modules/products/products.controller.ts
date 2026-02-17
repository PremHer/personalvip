import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Products')
@Controller('products')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ProductsController {
    constructor(private service: ProductsService) { }

    @Get()
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('category') category?: string,
    ) {
        return this.service.findAll(page, limit, search, category);
    }

    @Get('low-stock')
    @Roles('ADMIN', 'OWNER')
    getLowStock(@Query('threshold') threshold?: string) {
        return this.service.getLowStock(threshold ? Number(threshold) : undefined);
    }

    @Get('barcode/:barcode')
    findByBarcode(@Param('barcode') barcode: string) {
        return this.service.findByBarcode(barcode);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @Roles('ADMIN', 'OWNER')
    create(@Body() data: { name: string; barcode?: string; price: number; stock: number; category?: string }) {
        return this.service.create(data);
    }

    @Patch(':id')
    @Roles('ADMIN', 'OWNER')
    update(@Param('id') id: string, @Body() data: { name?: string; price?: number; stock?: number; category?: string }) {
        return this.service.update(id, data);
    }

    @Patch(':id/stock')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    adjustStock(@Param('id') id: string, @Body() data: { quantity: number }) {
        return this.service.adjustStock(id, data.quantity);
    }

    @Delete(':id')
    @Roles('ADMIN', 'OWNER')
    delete(@Param('id') id: string) {
        return this.service.delete(id);
    }
}
