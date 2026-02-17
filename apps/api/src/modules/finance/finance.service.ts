import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinanceService {
    constructor(private prisma: PrismaService) { }

    async getDashboard() {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            todaySales, weekSales, monthSales, yesterdaySales,
            todayAttendance, yesterdayAttendance,
            activeMembers, expiringCount, lowStock, recentSales,
            totalClients, newClientsMonth,
        ] = await Promise.all([
            this.prisma.sale.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { total: true }, _count: true }),
            this.prisma.sale.aggregate({ where: { createdAt: { gte: weekStart } }, _sum: { total: true } }),
            this.prisma.sale.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { total: true } }),
            this.prisma.sale.aggregate({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } }, _sum: { total: true } }),
            this.prisma.attendance.count({ where: { checkIn: { gte: todayStart } } }),
            this.prisma.attendance.count({ where: { checkIn: { gte: yesterdayStart, lt: todayStart } } }),
            this.prisma.membership.count({ where: { status: 'ACTIVE' } }),
            this.prisma.membership.count({
                where: {
                    status: 'ACTIVE',
                    endDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.product.count({ where: { stock: { lte: 5 }, isActive: true } }),
            this.prisma.sale.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { include: { product: true } },
                    cashier: { select: { name: true } },
                },
            }),
            this.prisma.client.count(),
            this.prisma.client.count({ where: { createdAt: { gte: monthStart } } }),
        ]);

        // Income by payment method today
        const todayByMethod = await this.prisma.sale.groupBy({
            by: ['paymentMethod'],
            where: { createdAt: { gte: todayStart } },
            _sum: { total: true },
        });

        // Attendance last 7 days for trend chart
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const attendanceLast7 = await this.prisma.attendance.findMany({
            where: { checkIn: { gte: sevenDaysAgo } },
            select: { checkIn: true },
        });
        const attendanceTrend: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayStart);
            d.setDate(d.getDate() - i);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            const dateStr = d.toISOString().split('T')[0];
            const count = attendanceLast7.filter(a => {
                const t = new Date(a.checkIn);
                return t >= d && t < next;
            }).length;
            attendanceTrend.push({ date: dateStr, count });
        }

        // Peak hours (attendance by hour today)
        const todayCheckins = await this.prisma.attendance.findMany({
            where: { checkIn: { gte: todayStart } },
            select: { checkIn: true },
        });
        const peakHours: { hour: string; count: number }[] = [];
        for (let h = 5; h <= 22; h++) {
            const count = todayCheckins.filter(a => new Date(a.checkIn).getHours() === h).length;
            if (count > 0 || (h >= 6 && h <= 21)) {
                peakHours.push({ hour: `${h}:00`, count });
            }
        }

        return {
            todayIncome: Number(todaySales._sum.total || 0),
            todaySales: todaySales._count,
            yesterdayIncome: Number(yesterdaySales._sum.total || 0),
            weekIncome: Number(weekSales._sum.total || 0),
            monthIncome: Number(monthSales._sum.total || 0),
            todayAttendance,
            yesterdayAttendance,
            activeMembers,
            expiringMemberships: expiringCount,
            lowStockProducts: lowStock,
            totalClients,
            newClientsMonth,
            recentSales,
            attendanceTrend,
            peakHours,
            todayByPaymentMethod: todayByMethod.reduce(
                (acc, item) => ({ ...acc, [item.paymentMethod]: Number(item._sum.total || 0) }),
                { CASH: 0, CARD: 0, TRANSFER: 0 },
            ),
        };
    }

    async getDailyReport(date?: string) {
        const reportDate = date ? new Date(date) : new Date();
        const dayStart = new Date(reportDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(reportDate); dayEnd.setHours(23, 59, 59, 999);

        const [sales, attendance, byMethod] = await Promise.all([
            this.prisma.sale.aggregate({
                where: { createdAt: { gte: dayStart, lte: dayEnd } },
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.attendance.count({
                where: { checkIn: { gte: dayStart, lte: dayEnd } },
            }),
            this.prisma.sale.groupBy({
                by: ['paymentMethod'],
                where: { createdAt: { gte: dayStart, lte: dayEnd } },
                _sum: { total: true },
            }),
        ]);

        const methodTotals = byMethod.reduce(
            (acc, item) => ({ ...acc, [item.paymentMethod]: Number(item._sum.total || 0) }),
            { CASH: 0, CARD: 0, TRANSFER: 0 },
        );

        return {
            date: reportDate.toISOString().split('T')[0],
            totalIncome: Number(sales._sum.total || 0),
            totalSales: sales._count,
            totalAttendance: attendance,
            cashAmount: methodTotals.CASH,
            cardAmount: methodTotals.CARD,
            transferAmount: methodTotals.TRANSFER,
        };
    }

    /**
     * Get detailed sales report with date range filtering for export.
     */
    async getSalesReport(from?: string, to?: string) {
        const where: any = {};
        if (from) {
            const f = new Date(from); f.setHours(0, 0, 0, 0);
            where.createdAt = { ...where.createdAt, gte: f };
        }
        if (to) {
            const t = new Date(to); t.setHours(23, 59, 59, 999);
            where.createdAt = { ...where.createdAt, lte: t };
        }
        if (!from && !to) {
            // Default to today
            const today = new Date(); today.setHours(0, 0, 0, 0);
            where.createdAt = { gte: today };
        }

        const sales = await this.prisma.sale.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                client: { select: { name: true } },
                cashier: { select: { name: true } },
                items: { include: { product: { select: { name: true } } } },
            },
        });

        // Summary
        const totalAmount = sales.reduce((sum, s) => sum + Number(s.total), 0);
        const byMethod: Record<string, number> = {};
        sales.forEach(s => {
            byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + Number(s.total);
        });

        return {
            sales: sales.map(s => ({
                id: s.id,
                date: s.createdAt,
                client: s.client?.name || 'Venta directa',
                cashier: s.cashier?.name || '',
                total: Number(s.total),
                discount: Number(s.discount),
                paymentMethod: s.paymentMethod,
                items: s.items.map(i => ({
                    product: i.product.name,
                    quantity: i.quantity,
                    unitPrice: Number(i.unitPrice),
                    subtotal: Number(i.subtotal),
                })),
            })),
            summary: {
                totalSales: sales.length,
                totalAmount,
                byMethod,
            },
        };
    }

    async getIncomeChart(period: 'week' | 'month' | 'year' = 'month') {
        const now = new Date();
        let startDate: Date;
        let groupFormat: string;

        switch (period) {
            case 'week':
                startDate = new Date(now); startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now); startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date(now); startDate.setFullYear(startDate.getFullYear() - 1);
                break;
        }

        const sales = await this.prisma.sale.findMany({
            where: { createdAt: { gte: startDate } },
            select: { total: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by day
        const grouped = new Map<string, number>();
        for (const sale of sales) {
            const date = sale.createdAt.toISOString().split('T')[0];
            grouped.set(date, (grouped.get(date) || 0) + Number(sale.total));
        }

        return Array.from(grouped.entries()).map(([date, total]) => ({ date, total }));
    }

    // ===== Cash Register =====
    async openCashRegister(userId: string, openingAmount: number) {
        return this.prisma.cashRegister.create({
            data: {
                openedById: userId,
                openingAmount,
            },
        });
    }

    async closeCashRegister(registerId: string, userId: string, closingAmount: number, notes?: string) {
        const register = await this.prisma.cashRegister.findUnique({ where: { id: registerId } });
        if (!register) throw new Error('Caja no encontrada');

        // Calculate expected amount
        const sales = await this.prisma.sale.aggregate({
            where: {
                createdAt: { gte: register.openedAt },
                paymentMethod: 'CASH', // Only count cash sales
            },
            _sum: { total: true },
        });

        const expectedAmount = Number(register.openingAmount) + Number(sales._sum.total || 0);

        return this.prisma.cashRegister.update({
            where: { id: registerId },
            data: {
                closedById: userId,
                closingAmount,
                expectedAmount,
                closedAt: new Date(),
                notes,
            },
        });
    }
}
