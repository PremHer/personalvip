import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @Roles('ADMIN', 'OWNER')
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
    ) {
        return this.usersService.findAll(page, limit, search);
    }

    @Get(':id')
    @Roles('ADMIN', 'OWNER')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles('ADMIN', 'OWNER')
    update(@Param('id') id: string, @Body() data: { name?: string; phone?: string; role?: 'ADMIN' | 'OWNER' | 'TRAINER' | 'RECEPTIONIST' | 'CLIENT'; isActive?: boolean }) {
        return this.usersService.update(id, data);
    }
}
