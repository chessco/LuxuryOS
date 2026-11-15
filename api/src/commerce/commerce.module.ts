import { Module } from '@nestjs/common';
import { CommerceService } from './commerce.service';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { InternalPosController } from './internal-pos.controller';
import { ReservationExpiryService } from './reservation-expiry.service';

@Module({
  controllers: [InternalPosController, CreditController],
  providers: [CommerceService, CreditService, ReservationExpiryService],
  exports: [CommerceService, CreditService],
})
export class CommerceModule {}
