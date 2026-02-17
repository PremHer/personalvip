import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    async findAll(page = 1, limit = 20, search?: string, category?: string) {
        const where: Record<string, unknown> = { isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (category) where.category = category;

        const [data, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.prisma.product.count({ where }),
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) throw new NotFoundException('Producto no encontrado');
        return product;
    }

    async findByBarcode(barcode: string) {
        const product = await this.prisma.product.findUnique({ where: { barcode } });
        if (!product) throw new NotFoundException('Producto no encontrado');
        return product;
    }

    async create(data: { name: string; barcode?: string; price: number; stock: number; category?: string }) {
        return this.prisma.product.create({ data });
    }

    async update(id: string, data: { name?: string; price?: number; stock?: number; category?: string }) {
        return this.prisma.product.update({ where: { id }, data });
    }

    async adjustStock(id: string, quantity: number) {
        return this.prisma.product.update({
            where: { id },
            data: { stock: { increment: quantity } },
        });
    }

    async getLowStock(threshold = 5) {
        return this.prisma.product.findMany({
            where: { stock: { lte: threshold }, isActive: true },
            orderBy: { stock: 'asc' },
        });
    }

    async delete(id: string) {
        return this.prisma.product.update({ where: { id }, data: { isActive: false } });
    }
}
