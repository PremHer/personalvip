import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const method = request.method;

        // Only audit mutations
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
            const user = request.user;
            const action = `${method} ${request.route?.path || request.url}`;
            const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';

            return next.handle().pipe(
                tap(async (responseData) => {
                    try {
                        await this.prisma.auditLog.create({
                            data: {
                                userId: user?.id || 'system',
                                action,
                                entityType: this.extractEntityType(request.url),
                                entityId: request.params?.id || null,
                                newValues: method !== 'DELETE' ? (request.body || null) : null,
                                ipAddress: typeof ip === 'string' ? ip : String(ip),
                            },
                        });
                    } catch (e) {
                        // Don't fail the request if audit logging fails
                        console.error('Audit log error:', e);
                    }
                }),
            );
        }

        return next.handle();
    }

    private extractEntityType(url: string): string {
        const parts = url.split('/').filter(Boolean);
        // /api/clients/123 -> clients
        return parts[1] || 'unknown';
    }
}
