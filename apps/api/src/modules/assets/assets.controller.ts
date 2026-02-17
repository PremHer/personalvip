import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Assets')
@Controller('assets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'OWNER')
@ApiBearerAuth()
export class AssetsController {
    constructor(private service: AssetsService) { }

    @Get()
    findAll(@Query('status') status?: string) {
        return this.service.findAll(status);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    create(@Body() data: { name: string; serialNumber?: string; purchaseDate?: string; purchasePrice?: number; notes?: string }) {
        return this.service.create(data);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: { name?: string; status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'; notes?: string }) {
        return this.service.update(id, data);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.service.delete(id);
    }
}
