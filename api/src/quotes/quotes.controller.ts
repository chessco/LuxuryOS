import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConvertQuoteDto } from './dto/convert-quote.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}
  @Post() create(@Request() req: any, @Body() dto: CreateQuoteDto) { return this.quotes.create(req.user.tenantId, req.user.id || req.user.userId, dto); }
  @Get() list(@Request() req: any, @Query('status') status?: QuoteStatus) { return this.quotes.list(req.user.tenantId, status); }
  @Get(':id') get(@Request() req: any, @Param('id') id: string) { return this.quotes.get(req.user.tenantId, id); }
  @Patch(':id') update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateQuoteDto>) { return this.quotes.update(req.user.tenantId, id, dto); }
  @Post(':id/send-whatsapp') send(@Request() req: any, @Param('id') id: string) { return this.quotes.sendWhatsApp(req.user.tenantId, id); }
  @Post(':id/cancel') cancel(@Request() req: any, @Param('id') id: string) { return this.quotes.cancel(req.user.tenantId, id); }
  @Post(':id/convert') convert(@Request() req: any, @Param('id') id: string, @Body() dto: ConvertQuoteDto) { return this.quotes.convert(req.user.tenantId, id, dto, req.user.id || req.user.userId); }
}
