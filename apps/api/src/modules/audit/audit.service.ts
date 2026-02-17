import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async findAll(params: {
        page?: number;
        limit?: number;
        userId?: string;
        entityType?: string;
        dateFrom?: string;
        dateTo?: string;
        action?: string;
    }) {
        const { page = 1, limit = 50, userId, entityType, dateFrom, dateTo, action } = params;

        const where: Record<string, unknown> = {};
        if (userId) where.userId = userId;
        if (entityType) where.entityType = entityType;
        if (action) where.action = { contains: action, mode: 'insensitive' };
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
            if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
        }

        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}
