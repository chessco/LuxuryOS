import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [PaymentsService],
    exports: [PaymentsService],
    controllers: [PaymentsController],
})
export class PaymentsModule { }
