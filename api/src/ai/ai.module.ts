import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { AuraController } from './aura.controller';
import { AuraService } from './aura.service';

@Module({
  imports: [SettingsModule],
  controllers: [AuraController],
  providers: [AuraService],
})
export class AiModule {}
