import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ClientsService {
    constructor(private prisma: PrismaService) { }

    async findAll(page = 1, limit = 20, search?: string) {
        const where = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [data, total] = await Promise.all([
            this.prisma.client.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    memberships: {
                        where: { status: 'ACTIVE' },
                        include: { plan: true },
                        orderBy: { endDate: 'desc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.client.count({ where }),
        ]);

        const now = new Date();
        return {
            data: data.map((client) => {
                // Find the currently valid membership (started and not expired)
                const activeMembership = client.memberships.find(m => {
                    const start = new Date(m.startDate);
                    const end = new Date(m.endDate);
                    return start <= now && end >= now;
                }) || null;

                // Find upcoming (queued) membership
                const upcomingMembership = client.memberships.find(m => new Date(m.startDate) > now) || null;

                return {
                    ...client,
                    activeMembership,
                    upcomingMembership,
                    memberships: undefined,
                };
            }),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                memberships: {
                    include: { plan: true },
                    orderBy: { createdAt: 'desc' },
                },
                attendances: {
                    orderBy: { checkIn: 'desc' },
                    take: 10,
                },
                physicalProgress: {
                    orderBy: { recordDate: 'desc' },
                    take: 10,
                },
                trainerClients: {
                    include: {
                        trainer: {
                            include: { user: { select: { name: true } } },
                        },
                    },
                },
            },
        });

        if (!client) throw new NotFoundException('Cliente no encontrado');
        return client;
    }

    async findByQrCode(qrCode: string) {
        const client = await this.prisma.client.findUnique({
            where: { qrCode },
            include: {
                memberships: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    orderBy: { endDate: 'desc' },
                },
            },
        });

        if (!client) throw new NotFoundException('Código QR no válido');

        const now = new Date();
        const activeMembership = client.memberships.find(m => {
            const start = new Date(m.startDate);
            const end = new Date(m.endDate);
            return start <= now && end >= now;
        }) || null;

        return {
            ...client,
            activeMembership,
        };
    }

    async create(data: {
        name: string;
        email?: string;
        phone?: string;
        emergencyContact?: string;
        birthDate?: string;
        medicalNotes?: string;
    }) {
        const qrCode = `GYM-${uuid().substring(0, 8).toUpperCase()}`;

        return this.prisma.client.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                emergencyContact: data.emergencyContact,
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
                medicalNotes: data.medicalNotes,
                qrCode,
            },
        });
    }

    async update(id: string, data: {
        name?: string;
        email?: string;
        phone?: string;
        emergencyContact?: string;
        medicalNotes?: string;
    }) {
        return this.prisma.client.update({
            where: { id },
            data,
        });
    }

    async getQrCodeImage(id: string) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                memberships: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    orderBy: { endDate: 'desc' },
                },
            },
        });
        if (!client) throw new NotFoundException('Cliente no encontrado');

        const now = new Date();
        const activeMembership = client.memberships.find(m => {
            const start = new Date(m.startDate);
            const end = new Date(m.endDate);
            return start <= now && end >= now;
        }) || null;

        const upcomingMembership = client.memberships.find(m => new Date(m.startDate) > now) || null;

        const qrDataUrl = await QRCode.toDataURL(client.qrCode, {
            width: 300,
            margin: 2,
            color: { dark: '#7c3aed', light: '#ffffff' },
        });

        const daysLeft = activeMembership
            ? Math.ceil((new Date(activeMembership.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
            qrCode: client.qrCode,
            qrImage: qrDataUrl,
            client: {
                id: client.id,
                name: client.name,
            },
            membership: activeMembership ? {
                active: true,
                plan: activeMembership.plan.name,
                startDate: activeMembership.startDate,
                endDate: activeMembership.endDate,
                daysLeft,
            } : null,
            upcomingMembership: upcomingMembership ? {
                plan: upcomingMembership.plan.name,
                startDate: upcomingMembership.startDate,
            } : null,
            isValid: !!activeMembership,
        };
    }

    async delete(id: string) {
        return this.prisma.client.delete({ where: { id } });
    }
}
