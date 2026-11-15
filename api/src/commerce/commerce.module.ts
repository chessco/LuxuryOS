import { Module } from '@nestjs/common';
import { CommerceService } from './commerce.service';
import { InternalPosController } from './internal-pos.controller';
import { ReservationExpiryService } from './reservation-expiry.service';

@Module({
  controllers: [InternalPosController],
  providers: [CommerceService, ReservationExpiryService],
  exports: [CommerceService],
})
export class CommerceModule {}
