import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CommerceService } from './commerce.service';

const RESERVATION_EXPIRY_INTERVAL_MS = 60_000;

/**
 * Processes abandoned carts even when no user is making a request. Each API
 * replica may run it; CommerceService claims rows optimistically, so duplicate
 * ticks are safe and only one replica applies each expiration.
 */
@Injectable()
export class ReservationExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReservationExpiryService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly commerce: CommerceService) {}

  onModuleInit() {
    void this.run();
    this.timer = setInterval(() => void this.run(), RESERVATION_EXPIRY_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.commerce.releaseExpiredReservationsGlobally();
    } catch (error) {
      this.logger.error('No fue posible liberar reservas vencidas', error);
    } finally {
      this.running = false;
    }
  }
}
