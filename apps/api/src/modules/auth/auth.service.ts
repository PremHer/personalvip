import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../../common/types';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role as UserRole,
                phone: user.phone || undefined,
            },
        };
    }

    async register(data: {
        email: string;
        password: string;
        name: string;
        role?: UserRole;
        phone?: string;
    }) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new UnauthorizedException('El email ya está registrado');
        }

        const passwordHash = await bcrypt.hash(data.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                name: data.name,
                role: data.role || 'CLIENT',
                phone: data.phone,
            },
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
        };
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            phone: user.phone || undefined,
        };
    }
}
