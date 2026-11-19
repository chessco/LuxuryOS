import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommerceModule } from '../commerce/commerce.module';

@Module({
    imports: [PrismaModule, CommerceModule],
    providers: [PaymentsService],
    exports: [PaymentsService],
    controllers: [PaymentsController],
})
export class PaymentsModule { }
