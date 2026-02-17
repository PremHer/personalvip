import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttendanceService {
    constructor(private prisma: PrismaService) { }

    async checkIn(qrCode: string, validatedBy: string, method: 'QR' | 'MANUAL' = 'QR') {
        // Find client by QR code
        const client = await this.prisma.client.findUnique({
            where: { qrCode },
            include: {
                memberships: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    orderBy: { endDate: 'desc' },
                },
            },
        });

        if (!client) {
            return { success: false, message: '❌ Código QR no válido. Cliente no encontrado.' };
        }

        // Find current active membership (started and not expired)
        const now = new Date();
        const activeMembership = client.memberships.find(m => {
            const start = new Date(m.startDate);
            const end = new Date(m.endDate);
            return start <= now && end >= now;
        });

        if (!activeMembership) {
            // Check if there's a future (queued) membership
            const futureMembership = client.memberships.find(m => new Date(m.startDate) > now);

            if (futureMembership) {
                const startDate = new Date(futureMembership.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                return {
                    success: false,
                    message: `❌ ${client.name} tiene una membresía programada que inicia el ${startDate}. No puede ingresar aún.`,
                    client: { id: client.id, name: client.name },
                };
            }

            // Check for expired ones and auto-expire
            const expiredMems = client.memberships.filter(m => new Date(m.endDate) < now);
            if (expiredMems.length > 0) {
                await this.prisma.membership.updateMany({
                    where: { id: { in: expiredMems.map(m => m.id) } },
                    data: { status: 'EXPIRED' },
                });
            }

            return {
                success: false,
                message: `❌ ${client.name} no tiene membresía activa vigente.`,
                client: { id: client.id, name: client.name, qrCode: client.qrCode },
            };
        }

        // Check if already checked in today without checkout
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingCheckIn = await this.prisma.attendance.findFirst({
            where: {
                clientId: client.id,
                checkIn: { gte: today },
                checkOut: null,
            },
        });

        if (existingCheckIn) {
            return {
                success: false,
                message: `⚠️ ${client.name} ya tiene una entrada registrada hoy sin salida.`,
                client: { id: client.id, name: client.name },
            };
        }

        // Register check-in
        const attendance = await this.prisma.attendance.create({
            data: {
                clientId: client.id,
                validatedBy,
                method,
            },
        });

        const daysLeft = Math.ceil(
            (new Date(activeMembership.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
            success: true,
            message: `✅ Bienvenido, ${client.name}! Plan: ${activeMembership.plan.name}. Días restantes: ${daysLeft}.`,
            client: { id: client.id, name: client.name, photoUrl: client.photoUrl },
            membership: {
                plan: activeMembership.plan.name,
                endDate: activeMembership.endDate,
                daysLeft,
            },
            attendanceId: attendance.id,
        };
    }

    /**
     * Validate a QR code — returns client info and membership status.
     * If registerCheckIn is true, also registers attendance (used by mobile app).
     */
    async validateQr(qrCode: string, registerCheckIn = false) {
        const client = await this.prisma.client.findUnique({
            where: { qrCode },
            include: {
                memberships: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    orderBy: { endDate: 'desc' },
                },
            },
        });

        if (!client) {
            return { valid: false, canEnter: false, message: '❌ Código QR no válido' };
        }

        const now = new Date();
        const activeMembership = client.memberships.find(m => {
            const start = new Date(m.startDate);
            const end = new Date(m.endDate);
            return start <= now && end >= now;
        });

        const futureMembership = client.memberships.find(m => new Date(m.startDate) > now);
        const canEnter = !!activeMembership;

        // If registerCheckIn requested and client can enter, create attendance
        let checkInStatus: any = null;
        if (registerCheckIn && canEnter) {
            // Check if already checked in today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const existingCheckIn = await this.prisma.attendance.findFirst({
                where: {
                    clientId: client.id,
                    checkIn: { gte: today },
                    checkOut: null,
                },
            });

            if (existingCheckIn) {
                const checkInTime = new Date(existingCheckIn.checkIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                checkInStatus = {
                    registered: false,
                    alreadyCheckedIn: true,
                    message: `⚠️ ${client.name} ya registró entrada hoy a las ${checkInTime}. No se permite doble entrada.`,
                };
            } else {
                // Find an admin user to use as validator for mobile scans
                const adminUser = await this.prisma.user.findFirst({
                    where: { role: { in: ['ADMIN', 'OWNER'] } },
                });

                if (adminUser) {
                    const attendance = await this.prisma.attendance.create({
                        data: {
                            clientId: client.id,
                            validatedBy: adminUser.id,
                            method: 'QR',
                        },
                    });

                    checkInStatus = {
                        registered: true,
                        alreadyCheckedIn: false,
                        attendanceId: attendance.id,
                        message: `✅ Entrada registrada para ${client.name}.`,
                    };
                }
            }
        } else if (registerCheckIn && !canEnter) {
            checkInStatus = {
                registered: false,
                message: `❌ ${client.name} no puede ingresar — sin membresía activa.`,
            };
        }

        const daysLeft = activeMembership
            ? Math.ceil((new Date(activeMembership.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
            valid: true,
            canEnter,
            client: {
                id: client.id,
                name: client.name,
                photoUrl: client.photoUrl,
                qrCode: client.qrCode,
                medicalNotes: client.medicalNotes,
            },
            membership: activeMembership ? {
                active: true,
                plan: activeMembership.plan.name,
                startDate: activeMembership.startDate,
                endDate: activeMembership.endDate,
                daysLeft,
            } : null,
            upcomingMembership: futureMembership ? {
                plan: futureMembership.plan.name,
                startDate: futureMembership.startDate,
                endDate: futureMembership.endDate,
            } : null,
            checkIn: checkInStatus,
        };
    }

    async checkOut(clientId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await this.prisma.attendance.findFirst({
            where: {
                clientId,
                checkIn: { gte: today },
                checkOut: null,
            },
            orderBy: { checkIn: 'desc' },
        });

        if (!attendance) {
            throw new NotFoundException('No se encontró entrada sin salida para hoy');
        }

        return this.prisma.attendance.update({
            where: { id: attendance.id },
            data: { checkOut: new Date() },
        });
    }

    async getTodayAttendance() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.prisma.attendance.findMany({
            where: { checkIn: { gte: today } },
            include: {
                client: { select: { id: true, name: true, photoUrl: true } },
            },
            orderBy: { checkIn: 'desc' },
        });
    }

    async getAttendanceHistory(params: { date?: string; from?: string; to?: string; page?: number; limit?: number }) {
        const { date, from, to, page = 1, limit = 50 } = params;

        const where: any = {};

        if (date) {
            // Specific date
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            where.checkIn = { gte: d, lt: next };
        } else if (from || to) {
            where.checkIn = {};
            if (from) {
                const f = new Date(from);
                f.setHours(0, 0, 0, 0);
                where.checkIn.gte = f;
            }
            if (to) {
                const t = new Date(to);
                t.setHours(23, 59, 59, 999);
                where.checkIn.lte = t;
            }
        }

        const [records, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true, photoUrl: true } },
                },
                orderBy: { checkIn: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        return { data: records, total, page, totalPages: Math.ceil(total / limit) };
    }

    /**
     * Auto-checkout: Close all open attendance records from before today.
     * Sets checkOut to 23:00 of the check-in day.
     */
    async autoCheckOutAll() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const openRecords = await this.prisma.attendance.findMany({
            where: {
                checkOut: null,
                checkIn: { lt: todayStart },
            },
        });

        if (openRecords.length === 0) {
            return { closed: 0, message: 'No hay registros abiertos pendientes' };
        }

        for (const record of openRecords) {
            const checkOutTime = new Date(record.checkIn);
            checkOutTime.setHours(23, 0, 0, 0);
            await this.prisma.attendance.update({
                where: { id: record.id },
                data: { checkOut: checkOutTime },
            });
        }

        return { closed: openRecords.length, message: `Se cerraron ${openRecords.length} registros automáticamente` };
    }

    /**
     * Get client attendance history with stats.
     */
    async getClientAttendanceStats(clientId: string) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);

        const [totalVisits, monthVisits, weekVisits, last20] = await Promise.all([
            this.prisma.attendance.count({ where: { clientId } }),
            this.prisma.attendance.count({ where: { clientId, checkIn: { gte: monthStart } } }),
            this.prisma.attendance.count({ where: { clientId, checkIn: { gte: weekStart } } }),
            this.prisma.attendance.findMany({
                where: { clientId },
                orderBy: { checkIn: 'desc' },
                take: 20,
            }),
        ]);

        // Average visit duration (from completed visits)
        const completedVisits = last20.filter(v => v.checkOut);
        const avgDuration = completedVisits.length > 0
            ? completedVisits.reduce((sum, v) => {
                return sum + (new Date(v.checkOut!).getTime() - new Date(v.checkIn).getTime());
            }, 0) / completedVisits.length / 60000 // in minutes
            : 0;

        return {
            totalVisits,
            monthVisits,
            weekVisits,
            avgDurationMinutes: Math.round(avgDuration),
            recentVisits: last20,
        };
    }
}
