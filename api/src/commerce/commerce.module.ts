import { Module } from '@nestjs/common';
import { CommerceService } from './commerce.service';
import { InternalPosController } from './internal-pos.controller';

@Module({ controllers: [InternalPosController], providers: [CommerceService], exports: [CommerceService] })
export class CommerceModule {}
