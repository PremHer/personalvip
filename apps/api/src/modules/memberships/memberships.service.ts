import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { todayStartPeru, dayStartPeru, dayEndPeru } from '../../common/timezone';

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
            startDate = dayStartPeru(activeMembership.endDate);
        } else {
            startDate = data.startDate ? dayStartPeru(data.startDate) : dayStartPeru(new Date());
            if (activeMembership) {
                await this.prisma.membership.update({
                    where: { id: activeMembership.id },
                    data: { status: 'EXPIRED', endDate: dayEndPeru(new Date()) },
                });
            }
        }

        const rawEndDate = new Date(startDate);
        rawEndDate.setDate(rawEndDate.getDate() + plan.durationDays);
        const endDate = dayEndPeru(rawEndDate);

        // Create membership
        const membership = await this.prisma.membership.create({
            data: {
                clientId: data.clientId,
                planId: data.planId,
                startDate,
                endDate,
                amountPaid: plan.price, // Records the Total Debt Value of the plan for future calculation
                createdBy: data.createdBy,
                status: 'ACTIVE',
            },
            include: { plan: true, client: true },
        });

        // Record the initial payment for this membership
        if (data.amountPaid > 0) {
            await this.prisma.payment.create({
                data: {
                    membershipId: membership.id,
                    amount: data.amountPaid,
                    paymentMethod: (data.paymentMethod || 'CASH') as any,
                    cashierId: data.createdBy,
                    receiptUrl: data.receiptUrl || null,
                },
            });
        }

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

    async addPayment(id: string, data: { amountPaid: number; paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'YAPE_PLIN'; createdBy: string; receiptUrl?: string }) {
        const membership = await this.prisma.membership.findUnique({
            where: { id },
            include: { plan: true }
        });

        if (!membership) throw new NotFoundException('Membresía no encontrada');

        // Note: the original amountPaid field stored the plan price (total debt)
        // We do NOT update it; we just append the payment to track actual income
        return this.prisma.payment.create({
            data: {
                membershipId: id,
                amount: data.amountPaid,
                paymentMethod: data.paymentMethod,
                cashierId: data.createdBy,
                receiptUrl: data.receiptUrl || null,
            }
        });
    }

    async getPayments(id: string) {
        return this.prisma.payment.findMany({
            where: { membershipId: id },
            orderBy: { createdAt: 'desc' },
            include: { cashier: { select: { id: true, name: true } } }
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

        // 1. Record the one-off payment
        if (data.amountPaid > 0) {
            await this.prisma.payment.create({
                data: {
                    amount: data.amountPaid,
                    paymentMethod: (data.paymentMethod || 'CASH') as any,
                    cashierId: data.createdBy,
                    receiptUrl: data.receiptUrl || null,
                    notes: 'Pase Diario',
                },
            });
        }

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
