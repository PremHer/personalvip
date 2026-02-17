import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        cashierId: string;
        clientId?: string;
        items: { productId: string; quantity: number }[];
        paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
        discount?: number;
    }) {
        return this.prisma.$transaction(async (tx) => {
            // Validate and calculate items
            let total = 0;
            const saleItems: { productId: string; quantity: number; unitPrice: any; subtotal: number }[] = [];

            for (const item of data.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new BadRequestException(`Producto ${item.productId} no encontrado`);
                if (product.stock < item.quantity) {
                    throw new BadRequestException(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
                }

                const subtotal = Number(product.price) * item.quantity;
                total += subtotal;

                saleItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: product.price,
                    subtotal,
                });

                // Decrease stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });
            }

            const discount = data.discount || 0;
            const finalTotal = total - discount;

            // Create sale with items
            const sale = await tx.sale.create({
                data: {
                    cashierId: data.cashierId,
                    clientId: data.clientId || null,
                    total: finalTotal,
                    paymentMethod: data.paymentMethod,
                    discount,
                    items: {
                        create: saleItems,
                    },
                },
                include: {
                    items: { include: { product: true } },
                    client: true,
                },
            });

            return sale;
        });
    }

    async findAll(page = 1, limit = 20, dateFrom?: string, dateTo?: string) {
        const where: Record<string, unknown> = {};
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
            if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
        }

        const [data, total] = await Promise.all([
            this.prisma.sale.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    items: { include: { product: true } },
                    client: { select: { id: true, name: true } },
                    cashier: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.sale.count({ where }),
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findOne(id: string) {
        return this.prisma.sale.findUnique({
            where: { id },
            include: {
                items: { include: { product: true } },
                client: true,
                cashier: { select: { id: true, name: true } },
            },
        });
    }
}
