import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { todayStartPeru } from '../../common/timezone';

@Injectable()
export class MembershipsService {
    constructor(private prisma: PrismaService) { }

    async assign(data: {
        clientId: string;
        planId: string;
        amountPaid: number;
        createdBy: string;
        paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'YAPE_PLIN';
        receiptUrl?: string;
        startDate?: string;
        mode?: 'replace' | 'queue';
    }) {
        const plan = await this.prisma.membershipPlan.findUnique({ where: { id: data.planId } });
        if (!plan) throw new NotFoundException('Plan no encontrado');

        const activeMembership = await this.prisma.membership.findFirst({
            where: { clientId: data.clientId, status: 'ACTIVE' },
            include: { plan: true },
            orderBy: { endDate: 'desc' },
        });

        let startDate: Date;
        const mode = data.mode || 'replace';

        if (mode === 'queue' && activeMembership) {
            startDate = new Date(activeMembership.endDate);
        } else {
            startDate = data.startDate ? new Date(data.startDate) : new Date();
            if (activeMembership) {
                await this.prisma.membership.update({
                    where: { id: activeMembership.id },
                    data: { status: 'EXPIRED', endDate: new Date() },
                });
            }
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationDays);

        // Create membership
        const membership = await this.prisma.membership.create({
            data: {
                clientId: data.clientId,
                planId: data.planId,
                startDate,
                endDate,
                amountPaid: data.amountPaid,
                createdBy: data.createdBy,
                status: 'ACTIVE',
            },
            include: { plan: true, client: true },
        });

        // Record the payment as a Sale for income tracking
        await this.prisma.sale.create({
            data: {
                clientId: data.clientId,
                cashierId: data.createdBy,
                total: data.amountPaid,
                paymentMethod: (data.paymentMethod || 'CASH') as any,
                discount: 0,
                receiptUrl: data.receiptUrl || null,
            },
        });

        return membership;
    }

    async getClientActiveMembership(clientId: string) {
        return this.prisma.membership.findFirst({
            where: {
                clientId,
                status: 'ACTIVE',
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
            },
            include: { plan: true },
            orderBy: { endDate: 'desc' },
        });
    }

    async getClientUpcoming(clientId: string) {
        return this.prisma.membership.findFirst({
            where: {
                clientId,
                status: 'ACTIVE',
                startDate: { gt: new Date() },
            },
            include: { plan: true },
            orderBy: { startDate: 'asc' },
        });
    }

    async freeze(id: string) {
        const membership = await this.prisma.membership.findUnique({ where: { id } });
        if (!membership) throw new NotFoundException('Membresía no encontrada');
        if (membership.status !== 'ACTIVE') throw new BadRequestException('Solo se puede congelar una membresía activa');

        return this.prisma.membership.update({
            where: { id },
            data: { status: 'FROZEN' },
        });
    }

    async unfreeze(id: string) {
        const membership = await this.prisma.membership.findUnique({ where: { id } });
        if (!membership) throw new NotFoundException('Membresía no encontrada');
        if (membership.status !== 'FROZEN') throw new BadRequestException('Solo se puede descongelar una membresía congelada');

        return this.prisma.membership.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });
    }

    async cancel(id: string) {
        return this.prisma.membership.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }

    async getExpiring(days = 7) {
        const future = new Date();
        future.setDate(future.getDate() + days);

        return this.prisma.membership.findMany({
            where: {
                status: 'ACTIVE',
                endDate: { lte: future },
                startDate: { lte: new Date() },
            },
            include: { client: true, plan: true },
            orderBy: { endDate: 'asc' },
        });
    }

    /**
     * Assign a daily pass — records payment as a Sale and check-in as Attendance.
     * Does NOT create a membership (daily pass is a one-time access, not a subscription).
     */
    async assignDailyPass(data: { clientId: string; amountPaid: number; createdBy: string; paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'YAPE_PLIN'; receiptUrl?: string }) {
        // Guard: check if client already has a check-in today
        const todayStart = todayStartPeru();
        const existingToday = await this.prisma.attendance.findFirst({
            where: { clientId: data.clientId, checkIn: { gte: todayStart } },
        });
        if (existingToday) {
            throw new BadRequestException('Este cliente ya tiene un pase/acceso registrado hoy');
        }

        // 1. Record the payment as a Sale
        await this.prisma.sale.create({
            data: {
                clientId: data.clientId,
                cashierId: data.createdBy,
                total: data.amountPaid,
                paymentMethod: (data.paymentMethod || 'CASH') as any,
                discount: 0,
                receiptUrl: data.receiptUrl || null,
            },
        });

        // 2. Record check-in attendance
        await this.prisma.attendance.create({
            data: {
                clientId: data.clientId,
                validatedBy: data.createdBy,
                method: 'MANUAL',
            },
        });

        // 3. Return client info
        return this.prisma.client.findUnique({
            where: { id: data.clientId },
            include: {
                memberships: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    orderBy: { endDate: 'desc' },
                    take: 1,
                },
            },
        });
    }
}
