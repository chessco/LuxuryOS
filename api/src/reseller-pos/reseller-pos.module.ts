import { Module } from '@nestjs/common';
import { ResellerPosController } from './reseller-pos.controller';
import { ResellerPosService } from './reseller-pos.service';
import { CommerceModule } from '../commerce/commerce.module';

@Module({
  controllers: [ResellerPosController],
  imports: [CommerceModule],
  providers: [ResellerPosService],
})
export class ResellerPosModule {}
