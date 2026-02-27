import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../../common/types';

class LoginDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(6)
    password!: string;
}

class RegisterDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(6)
    password!: string;

    @IsString()
    name!: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsString()
    phone?: string;
}

class ChangePasswordDto {
    @IsString()
    currentPassword!: string;

    @IsString()
    @MinLength(6)
    newPassword!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @Post('register')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'OWNER')
    @ApiBearerAuth()
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Patch('change-password')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    async changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    }

    @Get('profile')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    async getProfile(@CurrentUser() user: { id: string }) {
        return this.authService.getProfile(user.id);
    }
}
