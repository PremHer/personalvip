import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssetsService {
    constructor(private prisma: PrismaService) { }

    async findAll(status?: string) {
        return this.prisma.asset.findMany({
            where: status ? { status: status as 'ACTIVE' | 'MAINTENANCE' | 'RETIRED' } : {},
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const asset = await this.prisma.asset.findUnique({ where: { id } });
        if (!asset) throw new NotFoundException('Activo no encontrado');
        return asset;
    }

    async create(data: { name: string; serialNumber?: string; purchaseDate?: string; purchasePrice?: number; notes?: string }) {
        return this.prisma.asset.create({
            data: {
                ...data,
                purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
            },
        });
    }

    async update(id: string, data: { name?: string; status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'; notes?: string }) {
        return this.prisma.asset.update({ where: { id }, data });
    }

    async delete(id: string) {
        return this.prisma.asset.update({ where: { id }, data: { status: 'RETIRED' } });
    }
}
