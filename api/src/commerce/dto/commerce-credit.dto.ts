import { CreditAccountStatus, CreditFacilityType, CreditSubjectType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimIfString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreditDrawdownDto {
  @IsEnum(CreditFacilityType)
  facilityType!: CreditFacilityType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MaxLength(191)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  termDays?: number;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpsertCreditAccountDto {
  @IsEnum(CreditSubjectType)
  subjectType!: CreditSubjectType;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  resellerId?: string;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  clientId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  revolvingLimit!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  defaultTermDays?: number;

  @IsOptional()
  @IsEnum(CreditAccountStatus)
  status?: CreditAccountStatus;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RecordCreditPaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  method!: string;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
