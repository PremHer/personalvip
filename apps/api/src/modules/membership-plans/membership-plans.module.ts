import { Module } from '@nestjs/common';
import { MembershipPlansService } from './membership-plans.service';
import { MembershipPlansController } from './membership-plans.controller';

@Module({
    controllers: [MembershipPlansController],
    providers: [MembershipPlansService],
    exports: [MembershipPlansService],
})
export class MembershipPlansModule { }
