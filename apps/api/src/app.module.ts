import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { MembershipPlansModule } from './modules/membership-plans/membership-plans.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ProductsModule } from './modules/products/products.module';
import { AssetsModule } from './modules/assets/assets.module';
import { SalesModule } from './modules/sales/sales.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        UsersModule,
        ClientsModule,
        MembershipPlansModule,
        MembershipsModule,
        AttendanceModule,
        ProductsModule,
        AssetsModule,
        SalesModule,
        FinanceModule,
        AuditModule,
    ],
})
export class AppModule { }
