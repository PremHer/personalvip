import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MembershipsService {
    constructor(private prisma: PrismaService) { }

    async assign(data: {
        clientId: string;
        planId: string;
        amountPaid: number;
        createdBy: string;
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
            // New membership starts when current one ends
            startDate = new Date(activeMembership.endDate);
        } else {
            startDate = data.startDate ? new Date(data.startDate) : new Date();

            // Expire current active membership if replacing
            if (activeMembership) {
                await this.prisma.membership.update({
                    where: { id: activeMembership.id },
                    data: { status: 'EXPIRED', endDate: new Date() },
                });
            }
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationDays);

        return this.prisma.membership.create({
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
     * Assign a daily pass (1-day membership) to a client.
     * Auto-creates the "Pase Diario" plan if it doesn't exist.
     */
    async assignDailyPass(data: { clientId: string; amountPaid: number; createdBy: string }) {
        // Find or create the daily pass plan
        let dailyPlan = await this.prisma.membershipPlan.findFirst({
            where: { durationDays: 1, name: { contains: 'Pase Diario' } },
        });

        if (!dailyPlan) {
            dailyPlan = await this.prisma.membershipPlan.create({
                data: {
                    name: 'Pase Diario',
                    price: data.amountPaid,
                    durationDays: 1,
                    description: 'Acceso por una sesión / un día',
                    isActive: true,
                },
            });
        }

        return this.assign({
            clientId: data.clientId,
            planId: dailyPlan.id,
            amountPaid: data.amountPaid,
            createdBy: data.createdBy,
            mode: 'replace',
        });
    }
}
