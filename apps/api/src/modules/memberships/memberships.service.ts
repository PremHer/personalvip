import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
        endDate?: string;
        mode?: 'replace' | 'queue';
        discountAmount?: number;
        discountDescription?: string;
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
            // Queue means we start the day AFTER the current active plan ends
            const nextDay = new Date(activeMembership.endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            startDate = dayStartPeru(nextDay);
        } else {
            startDate = data.startDate ? dayStartPeru(data.startDate) : dayStartPeru(new Date());
            if (activeMembership) {
                await this.prisma.membership.update({
                    where: { id: activeMembership.id },
                    data: { status: 'EXPIRED', endDate: dayEndPeru(new Date()) },
                });
            }
        }

        let endDate: Date;
        if (data.endDate) {
            endDate = dayEndPeru(data.endDate);
            // Validar maximo (duración del plan + 5 días de gracia)
            const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const maxDays = plan.durationDays + 5;
            if (diffDays > maxDays) {
                throw new BadRequestException(`La duración máxima permitida para este plan es de ${maxDays} días.`);
            }
            if (diffDays < 1) {
                throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
            }
        } else {
            const rawEndDate = new Date(startDate);
            rawEndDate.setDate(rawEndDate.getDate() + plan.durationDays);
            endDate = dayEndPeru(rawEndDate);
        }

        // Create membership
        const membership = await this.prisma.membership.create({
            data: {
                clientId: data.clientId,
                planId: data.planId,
                startDate,
                endDate,
                amountPaid: data.amountPaid, // Store the actual amount paid (not plan.price)
                discount: data.discountAmount || 0,
                createdBy: data.createdBy,
                status: 'ACTIVE',
            },
            include: { plan: true, client: true },
        });

        // Record the initial payment for this membership
        if (data.amountPaid > 0) {
            let notes: string | undefined = undefined;
            if (data.discountAmount && data.discountAmount > 0) {
                notes = `Descuento: S/ ${data.discountAmount}${data.discountDescription ? ` - ${data.discountDescription}` : ''}`;
            }

            await this.prisma.payment.create({
                data: {
                    membershipId: membership.id,
                    amount: data.amountPaid,
                    paymentMethod: (data.paymentMethod || 'CASH') as any,
                    cashierId: data.createdBy,
                    receiptUrl: data.receiptUrl || null,
                    notes: notes,
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

    async freeze(id: string, autoUnfreezeDate?: string) {
        const membership = await this.prisma.membership.findUnique({ where: { id } });
        if (!membership) throw new NotFoundException('Membresía no encontrada');
        if (membership.status !== 'ACTIVE') throw new BadRequestException('Solo se puede congelar una membresía activa');

        return this.prisma.membership.update({
            where: { id },
            data: { 
                status: 'FROZEN',
                frozenAt: new Date(),
                autoUnfreezeDate: autoUnfreezeDate ? dayStartPeru(autoUnfreezeDate) : null
            },
        });
    }

    async unfreeze(id: string) {
        const membership = await this.prisma.membership.findUnique({ where: { id } });
        if (!membership) throw new NotFoundException('Membresía no encontrada');
        if (membership.status !== 'FROZEN') throw new BadRequestException('Solo se puede descongelar una membresía congelada');

        let endDate = membership.endDate;
        if (membership.frozenAt) {
            const now = new Date();
            const freezeTime = now.getTime() - new Date(membership.frozenAt).getTime();
            // Calcular diferencia en días exactos matemáticos. (Si congeló por horas, no cuenta mínimo de 1 día, pero asumo mínimo 1 si freezeTime > 0)
            const daysFrozen = Math.max(1, Math.floor(freezeTime / (1000 * 60 * 60 * 24)));
            
            // Añadir los días pausados al endDate
            endDate = new Date(membership.endDate);
            endDate.setDate(endDate.getDate() + daysFrozen);
        }

        return this.prisma.membership.update({
            where: { id },
            data: { 
                status: 'ACTIVE',
                endDate,
                frozenAt: null,
                autoUnfreezeDate: null
            },
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleAutoUnfreeze() {
        // Ejecución diaria a media noche para encontrar membresías programadas a reactivarse
        const today = dayStartPeru(new Date());
        
        const toUnfreeze = await this.prisma.membership.findMany({
            where: {
                status: 'FROZEN',
                autoUnfreezeDate: { not: null, lte: today },
            },
            select: { id: true },
        });

        for (const m of toUnfreeze) {
            try {
                await this.unfreeze(m.id);
            } catch (error) {
                console.error(`[AutoUnfreeze] Error descongelando membresía ${m.id}:`, error);
            }
        }
        
        if (toUnfreeze.length > 0) {
            console.log(`[AutoUnfreeze] Completado. ${toUnfreeze.length} membresías reactivadas.`);
        }
    }

    async cancel(id: string) {
        return this.prisma.membership.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }

    async delete(id: string) {
        // Find if it exists
        const membership = await this.prisma.membership.findUnique({ where: { id } });
        if (!membership) throw new NotFoundException('Membresía no encontrada');

        // Prisma cascade delete will handle related Payments automatically
        return this.prisma.membership.delete({
            where: { id },
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
            // Fetch client name to include in payment notes for income report
            const client = await this.prisma.client.findUnique({ where: { id: data.clientId }, select: { name: true } });
            await this.prisma.payment.create({
                data: {
                    amount: data.amountPaid,
                    paymentMethod: (data.paymentMethod || 'CASH') as any,
                    cashierId: data.createdBy,
                    receiptUrl: data.receiptUrl || null,
                    notes: `Pase Diario - ${client?.name || 'Cliente'}`,
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
