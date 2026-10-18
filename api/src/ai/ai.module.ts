import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { AuraController } from './aura.controller';
import { AuraService } from './aura.service';
import { AuraToolsController } from './aura-tools.controller';
import { AuraToolsService } from './aura-tools.service';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [AuraController, AuraToolsController],
  providers: [AuraService, AuraToolsService],
})
export class AiModule {}
