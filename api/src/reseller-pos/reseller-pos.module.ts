import { Module } from '@nestjs/common';
import { ResellerPosController } from './reseller-pos.controller';
import { ResellerPosService } from './reseller-pos.service';

@Module({
  controllers: [ResellerPosController],
  providers: [ResellerPosService],
})
export class ResellerPosModule {}
