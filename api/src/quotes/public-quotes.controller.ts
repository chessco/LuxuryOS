import { Controller, Get, HttpException, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { RateLimiter } from '../common/rate-limiter';
import { clientIp } from '../common/roles.util';
import { QuotesService } from './quotes.service';

@Controller('public/quotes')
export class PublicQuotesController {
  private readonly reads = new RateLimiter(120, 10 * 60 * 1000);
  private readonly writes = new RateLimiter(10, 15 * 60 * 1000);
  constructor(private readonly quotes: QuotesService) {}
  private limit(req: any, write = false) {
    if (!(write ? this.writes : this.reads).consume(clientIp(req))) throw new HttpException('Demasiadas solicitudes', HttpStatus.TOO_MANY_REQUESTS);
  }
  @Get(':token') get(@Req() req: any, @Param('token') token: string) { this.limit(req); return this.quotes.publicGet(token); }
  @Post(':token/authorize') authorize(@Req() req: any, @Param('token') token: string) { this.limit(req, true); return this.quotes.authorize(token); }
}
