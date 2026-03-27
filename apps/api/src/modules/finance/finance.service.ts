import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { nowPeru, todayStartPeru, dayStartPeru, dayEndPeru } from '../../common/timezone';

@Injectable()
export class FinanceService {
    constructor(private prisma: PrismaService) { }

    async getDashboard() {
        const now = nowPeru();
        const todayStart = todayStartPeru();
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = dayStartPeru(new Date(now.getFullYear(), now.getMonth(), 1));

        const [
            todayPayments, weekPayments, monthPayments, yesterdayPayments,
            todayMembershipCount, yesterdayMembershipCount,
            todayAttendance, yesterdayAttendance,
            activeMembers, expiringCount, lowStock, recentSales,
            totalClients, newClientsMonth,
        ] = await Promise.all([
            // Unified Income
            this.prisma.payment.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { amount: true }, _count: true }),
            this.prisma.payment.aggregate({ where: { createdAt: { gte: weekStart } }, _sum: { amount: true } }),
            this.prisma.payment.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amount: true } }),
            this.prisma.payment.aggregate({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } }, _sum: { amount: true } }),
            // Pure Counts
            this.prisma.membership.count({ where: { createdAt: { gte: todayStart } } }),
            this.prisma.membership.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
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
        const todayByMethod = await this.prisma.payment.groupBy({
            by: ['paymentMethod'],
            where: { createdAt: { gte: todayStart } },
            _sum: { amount: true },
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

        // Unified income for the Dashboard
        const totalTodayIncome = Number(todayPayments._sum.amount || 0);
        const totalYesterdayIncome = Number(yesterdayPayments._sum.amount || 0);
        const totalWeekIncome = Number(weekPayments._sum.amount || 0);
        const totalMonthIncome = Number(monthPayments._sum.amount || 0);

        return {
            todayIncome: totalTodayIncome,
            todaySales: todayPayments._count,
            yesterdayIncome: totalYesterdayIncome,
            weekIncome: totalWeekIncome,
            monthIncome: totalMonthIncome,
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
                (acc, item) => ({ ...acc, [item.paymentMethod]: Number(item._sum.amount || 0) }),
                { CASH: 0, CARD: 0, TRANSFER: 0, YAPE_PLIN: 0 },
            ),
            todayMembershipCount,
        };
    }

    async getDailyReport(date?: string) {
        const reportDate = date ? new Date(date) : new Date();
        const dayStart = dayStartPeru(reportDate);
        const dayEnd = dayEndPeru(reportDate);

        const [payments, attendance, byMethod] = await Promise.all([
            this.prisma.payment.aggregate({
                where: { createdAt: { gte: dayStart, lte: dayEnd } },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.attendance.count({
                where: { checkIn: { gte: dayStart, lte: dayEnd } },
            }),
            this.prisma.payment.groupBy({
                by: ['paymentMethod'],
                where: { createdAt: { gte: dayStart, lte: dayEnd } },
                _sum: { amount: true },
            }),
        ]);

        const methodTotals = byMethod.reduce(
            (acc, item) => ({ ...acc, [item.paymentMethod]: Number(item._sum.amount || 0) }),
            { CASH: 0, CARD: 0, TRANSFER: 0, YAPE_PLIN: 0 },
        );

        return {
            date: reportDate.toISOString().split('T')[0],
            totalIncome: Number(payments._sum.amount || 0),
            totalSales: payments._count, // Representa Transacciones, no solo el record Sale
            totalAttendance: attendance,
            cashAmount: methodTotals.CASH,
            cardAmount: methodTotals.CARD,
            transferAmount: methodTotals.TRANSFER,
            yapeAmount: methodTotals.YAPE_PLIN,
        };
    }

    /**
     * Get detailed sales report with date range filtering for export.
     */
    async getSalesReport(from?: string, to?: string) {
        const where: any = {};
        if (from) {
            const f = dayStartPeru(from);
            where.createdAt = { ...where.createdAt, gte: f };
        }
        if (to) {
            const t = dayEndPeru(to);
            where.createdAt = { ...where.createdAt, lte: t };
        }
        if (!from && !to) {
            // Default to today
            where.createdAt = { gte: todayStartPeru() };
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

        const payments = await this.prisma.payment.findMany({
            where: { createdAt: { gte: startDate } },
            select: { amount: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by day
        const grouped = new Map<string, number>();
        for (const payment of payments) {
            const date = payment.createdAt.toISOString().split('T')[0];
            grouped.set(date, (grouped.get(date) || 0) + Number(payment.amount));
        }

        return Array.from(grouped.entries()).map(([date, total]) => ({ date, total }));
    }

    /**
     * Get income grouped by receptionist (cashier).
     * Calculates totals by type (Membership, Daily Pass, Other POS Sales) and by Payment Method.
     */
    async getReceptionistIncome(params: { cashierId?: string; from?: string; to?: string; period?: 'today' | 'week' | 'month' | 'year' | 'all' }) {
        const { cashierId, from, to, period = 'today' } = params;
        const where: any = {};

        if (cashierId) {
            where.cashierId = cashierId;
        }

        // Apply date filters
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = dayStartPeru(from);
            if (to) where.createdAt.lte = dayEndPeru(to);
        } else {
            const now = new Date();
            let startDate: Date | undefined;
            if (period === 'today') startDate = todayStartPeru();
            else if (period === 'week') { startDate = new Date(now); startDate.setDate(now.getDate() - 7); }
            else if (period === 'month') { startDate = new Date(now.getFullYear(), now.getMonth(), 1); }
            else if (period === 'year') { startDate = new Date(now.getFullYear(), 0, 1); }

            if (startDate) {
                where.createdAt = { gte: startDate };
            }
        }

        // Fetch all matching payments
        const payments = await this.prisma.payment.findMany({
            where,
            include: {
                cashier: { select: { id: true, name: true, role: true } },
                membership: { include: { plan: true, client: { select: { name: true } } } },
                sale: { include: { items: { include: { product: true } }, client: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const usersMap = new Map<string, any>();

        for (const p of payments) {
            const cid = p.cashier.id;
            if (!usersMap.has(cid)) {
                usersMap.set(cid, {
                    id: cid,
                    name: p.cashier.name,
                    role: p.cashier.role,
                    totalIncome: 0,
                    membershipIncome: 0,
                    posIncome: 0,
                    dailyPassIncome: 0,
                    byMethod: { CASH: 0, CARD: 0, TRANSFER: 0, YAPE_PLIN: 0 },
                    transactions: [],
                });
            }

            const c = usersMap.get(cid);
            const amt = Number(p.amount);

            c.totalIncome += amt;
            c.byMethod[p.paymentMethod] = (c.byMethod[p.paymentMethod] || 0) + amt;

            let type = 'OTRO';
            let description = '';
            let clientName = '';

            if (p.membership) {
                type = 'MEMBRESÍA';
                description = p.membership.plan.name;
                clientName = p.membership.client.name;
                c.membershipIncome += amt;
            } else if (p.sale) {
                // Determine if it's a daily pass or a regular product sale
                const isDailyPass = p.sale.items.some(i => i.product.name.toLowerCase().includes('pase diario') || i.product.name.toLowerCase().includes('diario') || i.product.name.toLowerCase().includes('visita'));
                if (isDailyPass) {
                    type = 'PASE DIARIO';
                    c.dailyPassIncome += amt;
                } else {
                    type = 'VENTAS POS';
                    c.posIncome += amt;
                }
                description = p.sale.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ');
                clientName = p.sale.client ? p.sale.client.name : 'Venta Directa';
            } else if (p.notes && p.notes.toLowerCase().includes('pase diario')) {
                // Daily pass registered directly as a Payment (without Sale)
                type = 'PASE DIARIO';
                description = 'Pase Diario';
                // Extract client name from notes: "Pase Diario - ClientName"
                const dashIdx = p.notes.indexOf(' - ');
                if (dashIdx !== -1) {
                    clientName = p.notes.substring(dashIdx + 3);
                }
                c.dailyPassIncome += amt;
            }

            c.transactions.push({
                id: p.id,
                date: p.createdAt,
                amount: amt,
                method: p.paymentMethod,
                type,
                description,
                clientName,
            });
        }

        return Array.from(usersMap.values());
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

        // Calculate expected amount based strictly on Cash Payments
        const payments = await this.prisma.payment.aggregate({
            where: {
                createdAt: { gte: register.openedAt },
                paymentMethod: 'CASH', // Only count cash income
            },
            _sum: { amount: true },
        });

        const expectedAmount = Number(register.openingAmount) + Number(payments._sum.amount || 0);

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
