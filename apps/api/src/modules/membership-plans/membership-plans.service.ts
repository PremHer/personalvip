import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MembershipPlansService {
    constructor(private prisma: PrismaService) { }

    async findAll(activeOnly = false) {
        return this.prisma.membershipPlan.findMany({
            where: activeOnly ? { isActive: true } : {},
            orderBy: { price: 'asc' },
        });
    }

    async findOne(id: string) {
        const plan = await this.prisma.membershipPlan.findUnique({ where: { id } });
        if (!plan) throw new NotFoundException('Plan no encontrado');
        return plan;
    }

    async create(data: { name: string; price: number; durationDays: number; description?: string }) {
        return this.prisma.membershipPlan.create({ data });
    }

    async update(id: string, data: { name?: string; price?: number; durationDays?: number; description?: string; isActive?: boolean }) {
        return this.prisma.membershipPlan.update({ where: { id }, data });
    }

    async delete(id: string) {
        return this.prisma.membershipPlan.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
