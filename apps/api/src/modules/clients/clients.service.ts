import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';
import { dayStartPeru, dayEndPeru } from '../../common/timezone';

@Injectable()
export class ClientsService {
    constructor(private prisma: PrismaService) { }

    async findAll(page = 1, limit = 20, search?: string, showInactive = false) {
        const trimmedSearch = search?.trim();

        // If there's an active search keyword, search ALL clients (active & inactive)
        // so the user can find disabled clients (e.g. searching by DNI, phone, name)
        // If there's no search keyword, follow showInactive flag (default to active only).
        const baseWhere: any = (showInactive || Boolean(trimmedSearch)) ? {} : { isActive: true };

        const where = trimmedSearch
            ? {
                ...baseWhere,
                OR: [
                    { name: { contains: trimmedSearch, mode: 'insensitive' as const } },
                    { email: { contains: trimmedSearch, mode: 'insensitive' as const } },
                    { phone: { contains: trimmedSearch, mode: 'insensitive' as const } },
                    { dni: { contains: trimmedSearch, mode: 'insensitive' as const } },
                ],
            }
            : baseWhere;

        const todayStart = dayStartPeru(new Date());

        const [data, total] = await Promise.all([
            this.prisma.client.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    memberships: {
                        where: { status: 'ACTIVE' },
                        include: { plan: true, payments: true },
                        orderBy: { endDate: 'desc' },
                    },
                    attendances: {
                        where: { checkIn: { gte: todayStart } },
                        take: 1,
                        orderBy: { checkIn: 'desc' },
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

                // Detect daily pass: client checked in today but has NO active membership
                const hasDailyPassToday = !activeMembership && (client as any).attendances?.length > 0;

                return {
                    ...client,
                    activeMembership,
                    upcomingMembership,
                    hasDailyPassToday,
                    memberships: undefined,
                    attendances: undefined,
                };
            }),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async toggleActive(id: string, isActive: boolean) {
        const client = await this.prisma.client.findUnique({ where: { id } });
        if (!client) throw new NotFoundException('Cliente no encontrado');
        return this.prisma.client.update({
            where: { id },
            data: { isActive },
        });
    }

    async findOne(id: string) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                memberships: {
                    include: { plan: true, payments: true },
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
                sales: {
                    include: {
                        items: { include: { product: true } },
                        cashier: { select: { name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 15,
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

    async findByDni(dni: string) {
        const trimmedDni = dni?.trim();
        if (!trimmedDni) return null;

        const client = await this.prisma.client.findFirst({
            where: { dni: { equals: trimmedDni, mode: 'insensitive' } },
            include: {
                memberships: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    orderBy: { endDate: 'desc' },
                },
            },
        });

        if (!client) return null;

        const now = new Date();
        const activeMembership = client.memberships.find(m => {
            const start = new Date(m.startDate);
            const end = new Date(m.endDate);
            return start <= now && end >= now;
        }) || null;

        return { ...client, activeMembership, memberships: undefined };
    }

    async create(data: {
        name: string;
        email?: string;
        phone?: string;
        dni?: string;
        emergencyContact?: string;
        birthDate?: string;
        medicalNotes?: string;
        isMigration?: boolean;
        isDailyPass?: boolean;
        migrationPlanId?: string;
        migrationEndDate?: string;
        createdBy?: string;
    }) {
        const trimmedDni = data.dni?.trim();
        // DNI is required for regular clients, but optional for daily passes and migrations
        if (!data.isMigration && !data.isDailyPass && !trimmedDni) {
            throw new BadRequestException('El DNI es obligatorio para clientes nuevos.');
        }

        if (trimmedDni) {
            const existingDni = await this.prisma.client.findFirst({
                where: { dni: { equals: trimmedDni, mode: 'insensitive' } }
            });

            if (existingDni) {
                if (!existingDni.isActive) {
                    // Client exists in database but was deactivated: reactivate and update!
                    const updated = await this.prisma.client.update({
                        where: { id: existingDni.id },
                        data: {
                            name: data.name.trim(),
                            email: data.email?.trim() || existingDni.email,
                            phone: data.phone?.trim() || existingDni.phone,
                            emergencyContact: data.emergencyContact?.trim() || existingDni.emergencyContact,
                            birthDate: data.birthDate ? new Date(data.birthDate) : existingDni.birthDate,
                            medicalNotes: data.medicalNotes?.trim() || existingDni.medicalNotes,
                            isActive: true,
                        }
                    });

                    // Handle Legacy Excel Migration if specified
                    if (data.isMigration && data.migrationPlanId && data.migrationEndDate) {
                        const plan = await this.prisma.membershipPlan.findUnique({
                            where: { id: data.migrationPlanId }
                        });

                        if (plan) {
                            const startDate = dayStartPeru(new Date());
                            const endDate = dayEndPeru(data.migrationEndDate);

                            await this.prisma.membership.create({
                                data: {
                                    clientId: updated.id,
                                    planId: plan.id,
                                    startDate,
                                    endDate,
                                    status: 'ACTIVE',
                                    amountPaid: plan.price,
                                    createdBy: data.createdBy || 'SYSTEM'
                                }
                            });
                        }
                    }

                    return updated;
                } else {
                    throw new BadRequestException(`El DNI ${trimmedDni} ya está registrado para el cliente "${existingDni.name}".`);
                }
            }
        }

        const qrCode = `GYM-${uuid().substring(0, 8).toUpperCase()}`;

        // Create client first
        const client = await this.prisma.client.create({
            data: {
                name: data.name.trim(),
                email: data.email?.trim() || undefined,
                phone: data.phone?.trim() || undefined,
                dni: trimmedDni || undefined,
                emergencyContact: data.emergencyContact?.trim() || undefined,
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
                medicalNotes: data.medicalNotes?.trim() || undefined,
                qrCode,
            },
        });

        // Handle Legacy Excel Migration
        if (data.isMigration && data.migrationPlanId && data.migrationEndDate) {
            const plan = await this.prisma.membershipPlan.findUnique({
                where: { id: data.migrationPlanId }
            });

            if (plan) {
                // Determine exact start and end boundaries
                const startDate = dayStartPeru(new Date());
                const endDate = dayEndPeru(data.migrationEndDate);

                await this.prisma.membership.create({
                    data: {
                        clientId: client.id,
                        planId: plan.id,
                        startDate,
                        endDate,
                        status: 'ACTIVE',
                        amountPaid: plan.price, // Mark it as fully paid to avoid Debt Card flagging
                        createdBy: data.createdBy || 'SYSTEM' // Fallback to 'SYSTEM' if undefined
                    }
                });
            }
        }

        return client;
    }

    async update(id: string, data: {
        name?: string;
        email?: string;
        phone?: string;
        dni?: string;
        emergencyContact?: string;
        birthDate?: string;
        medicalNotes?: string;
        isActive?: boolean;
    }) {
        const client = await this.prisma.client.findUnique({ where: { id } });
        if (!client) throw new NotFoundException('Cliente no encontrado');

        if (data.dni && data.dni.trim() !== '') {
            const trimmedDni = data.dni.trim();
            const existingDni = await this.prisma.client.findFirst({
                where: {
                    dni: { equals: trimmedDni, mode: 'insensitive' },
                    NOT: { id }
                }
            });
            if (existingDni) {
                throw new BadRequestException(`El DNI ${trimmedDni} ya está registrado para el cliente "${existingDni.name}".`);
            }
        }

        const updatePayload: any = {};
        if (data.name !== undefined) updatePayload.name = data.name.trim();
        if (data.email !== undefined) updatePayload.email = data.email?.trim() || null;
        if (data.phone !== undefined) updatePayload.phone = data.phone?.trim() || null;
        if (data.dni !== undefined) updatePayload.dni = data.dni?.trim() || null;
        if (data.emergencyContact !== undefined) updatePayload.emergencyContact = data.emergencyContact?.trim() || null;
        if (data.birthDate !== undefined) updatePayload.birthDate = data.birthDate ? new Date(data.birthDate) : null;
        if (data.medicalNotes !== undefined) updatePayload.medicalNotes = data.medicalNotes?.trim() || null;
        if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

        return this.prisma.client.update({
            where: { id },
            data: updatePayload,
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
