import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { IsString, IsOptional, IsEmail, IsNotEmpty, ValidateIf } from 'class-validator';

class CreateClientDto {
    @IsString() @IsNotEmpty() name!: string;
    @ValidateIf(o => o.email !== '' && o.email !== undefined && o.email !== null)
    @IsEmail() email?: string;
    @IsOptional() @IsString() phone?: string;
    @IsString() @IsNotEmpty() dni!: string;
    @IsOptional() @IsString() emergencyContact?: string;
    @IsOptional() @IsString() birthDate?: string;
    @IsOptional() @IsString() medicalNotes?: string;

    // Migration fields
    @IsOptional() isMigration?: boolean;
    @IsOptional() @IsString() migrationPlanId?: string;
    @IsOptional() @IsString() migrationEndDate?: string;
}

@ApiTags('Clients')
@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ClientsController {
    constructor(private clientsService: ClientsService) { }

    @Get()
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST', 'TRAINER')
    findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
    ) {
        return this.clientsService.findAll(page, limit, search);
    }

    @Get('search-dni/:dni')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    findByDni(@Param('dni') dni: string) {
        return this.clientsService.findByDni(dni);
    }

    @Get(':id')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST', 'TRAINER')
    findOne(@Param('id') id: string) {
        return this.clientsService.findOne(id);
    }

    @Get(':id/qr')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    getQrCode(@Param('id') id: string) {
        return this.clientsService.getQrCodeImage(id);
    }

    @Post()
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    create(@Body() dto: CreateClientDto) {
        return this.clientsService.create(dto);
    }

    @Patch(':id')
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    update(@Param('id') id: string, @Body() dto: Partial<CreateClientDto>) {
        return this.clientsService.update(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN', 'OWNER')
    delete(@Param('id') id: string) {
        return this.clientsService.delete(id);
    }
}
