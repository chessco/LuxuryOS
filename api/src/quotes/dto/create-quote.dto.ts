import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsString() @IsNotEmpty() clientId!: string;
  @IsString() @IsNotEmpty() pieceType!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() @Min(0) laborCost?: number;
  @IsOptional() @IsNumber() @Min(0) materialCost?: number;
  @IsNumber() @Min(0) totalAmount!: number;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() specifications?: Record<string, unknown>;
}
