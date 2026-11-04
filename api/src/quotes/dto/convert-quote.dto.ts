import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { OrderType } from '@prisma/client';

export class ConvertQuoteDto {
  @IsEnum(OrderType) targetType!: OrderType;
  @IsOptional() @IsDateString() promisedAt?: string;
  @IsOptional() operationalFields?: Record<string, unknown>;
}
