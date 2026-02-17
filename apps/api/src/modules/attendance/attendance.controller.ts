import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
    constructor(
        private service: AttendanceService,
        private prisma: PrismaService,
    ) { }

    @Post('check-in')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    @ApiBearerAuth()
    checkIn(
        @Body() data: { qrCode: string; method?: 'QR' | 'MANUAL' },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.checkIn(data.qrCode, user.id, data.method);
    }

    /**
     * QR validation endpoint — returns client info and membership validity.
     * Can be used by mobile apps or kiosks before doing a full check-in.
     * No auth required so the QR scanner can work independently.
     */
    @Post('scan')
    scanQr(@Body() data: { qrCode: string; registerCheckIn?: boolean }) {
        return this.service.validateQr(data.qrCode, data.registerCheckIn ?? false);
    }

    /**
     * Mobile check-in via QR scan — creates attendance record.
     * Requires JWT auth (mobile app must be logged in).
     */
    @Post('mobile-check-in')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST', 'TRAINER')
    @ApiBearerAuth()
    mobileCheckIn(
        @Body() data: { qrCode: string },
        @CurrentUser() user: { id: string },
    ) {
        return this.service.checkIn(data.qrCode, user.id, 'QR');
    }

    @Post('check-out/:clientId')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    @ApiBearerAuth()
    checkOut(@Param('clientId') clientId: string) {
        return this.service.checkOut(clientId);
    }

    @Get('today')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    @ApiBearerAuth()
    getTodayAttendance() {
        return this.service.getTodayAttendance();
    }

    /**
     * Public endpoint for mobile app — returns today's attendance.
     */
    @Get('today-public')
    getTodayAttendancePublic() {
        return this.service.getTodayAttendance();
    }

    @Get('history')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    @ApiBearerAuth()
    getHistory(
        @Query('date') date?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.service.getAttendanceHistory({ date, from, to, page: Number(page) || 1, limit: Number(limit) || 50 });
    }

    @Get('history-public')
    getHistoryPublic(
        @Query('date') date?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.service.getAttendanceHistory({ date, from, to, page: Number(page) || 1, limit: Number(limit) || 50 });
    }

    /**
     * Public endpoint for mobile app — registers check-out.
     */
    @Post('check-out-public/:clientId')
    checkOutPublic(@Param('clientId') clientId: string) {
        return this.service.checkOut(clientId);
    }

    /**
     * Public endpoint for mobile app — update client medical notes.
     */
    @Patch('update-medical-notes/:clientId')
    async updateMedicalNotes(
        @Param('clientId') clientId: string,
        @Body() data: { medicalNotes: string },
    ) {
        const client = await this.prisma.client.update({
            where: { id: clientId },
            data: { medicalNotes: data.medicalNotes },
        });
        return { id: client.id, medicalNotes: client.medicalNotes };
    }

    /**
     * Auto-checkout: Close all open attendance records from before today.
     */
    @Post('auto-checkout')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'OWNER')
    @ApiBearerAuth()
    autoCheckOut() {
        return this.service.autoCheckOutAll();
    }

    /**
     * Get client attendance stats (total, month, week, avg duration, recent).
     */
    @Get('client-stats/:clientId')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'OWNER', 'RECEPTIONIST')
    @ApiBearerAuth()
    getClientStats(@Param('clientId') clientId: string) {
        return this.service.getClientAttendanceStats(clientId);
    }
}

