import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  CreditFacilityType,
  CreditObligationStatus,
  CreditSubjectType,
  Role,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreditService } from './credit.service';
import { CreateCreditNoteDto, RecordCreditPaymentDto, UpsertCreditAccountDto } from './dto/commerce-credit.dto';

@Controller('commerce/credit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDEDOR, Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)
export class CreditController {
  constructor(private readonly credit: CreditService) {}

  @Get('accounts')
  listAccounts(
    @Request() req: any,
    @Query('subjectType') subjectType?: CreditSubjectType,
    @Query('q') q?: string,
    @Query('onlyOverdue') onlyOverdue?: string,
  ) {
    return this.credit.listAccounts(req.user, {
      subjectType,
      q,
      onlyOverdue: onlyOverdue === 'true',
    });
  }

  @Put('accounts')
  @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)
  upsertAccount(@Request() req: any, @Body() body: UpsertCreditAccountDto) {
    return this.credit.upsertAccount(req.user, body);
  }

  @Get('subject-summary')
  getSubjectSummary(
    @Request() req: any,
    @Query('resellerId') resellerId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.credit.getSubjectSummary(req.user, { resellerId, clientId });
  }

  @Get('obligations')
  listObligations(
    @Request() req: any,
    @Query('facilityType') facilityType?: CreditFacilityType,
    @Query('status') status?: CreditObligationStatus,
    @Query('subjectType') subjectType?: CreditSubjectType,
    @Query('q') q?: string,
  ) {
    return this.credit.listObligations(req.user, {
      facilityType,
      status,
      subjectType,
      q,
    });
  }

  @Get('obligations/:id')
  getObligation(@Request() req: any, @Param('id') id: string) {
    return this.credit.getObligation(req.user, id);
  }

  @Post('obligations/:id/payments')
  recordPayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: RecordCreditPaymentDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.credit.recordObligationPayment(req.user, id, body, key);
  }

  @Post('obligations/:id/credit-notes')
  @Roles(Role.TENANT_ADMIN, Role.SYSTEM_ADMIN)
  createCreditNote(@Request() req: any, @Param('id') id: string, @Body() body: CreateCreditNoteDto) {
    return this.credit.createCreditNote(req.user, id, body);
  }
}
