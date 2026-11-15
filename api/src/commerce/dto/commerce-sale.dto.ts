import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreditDrawdownDto } from './commerce-credit.dto';

export class SaleCartItemDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class SalePaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  method!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleCartItemDto)
  items!: SaleCartItemDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments?: SalePaymentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditDrawdownDto)
  creditDrawdowns?: CreditDrawdownDto[];

  @IsOptional()
  @IsBoolean()
  allowOverdueOverride?: boolean;
}

export class SettleSaleDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments?: SalePaymentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditDrawdownDto)
  creditDrawdowns?: CreditDrawdownDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  clientId?: string;

  @IsOptional()
  @IsBoolean()
  allowOverdueOverride?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CancelSaleDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
