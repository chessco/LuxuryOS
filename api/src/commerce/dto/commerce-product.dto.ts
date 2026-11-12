import { CommerceProductStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimIfString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const toOptionalBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

const toOptionalNullableNumber = ({ value }: { value: unknown }) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return Number(value);
};

export class CreateProductDto {
  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  sku!: string;

  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5_000_000)
  imageUrl?: string | null;

  @IsOptional()
  @Transform(toOptionalNullableNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @Transform(toOptionalNullableNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  resellerPrice?: number | null;

  @IsOptional()
  @Transform(toOptionalNullableNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  wholesalePrice?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockOnHand?: number;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  availableToResellers?: boolean;

  @IsOptional()
  @IsEnum(CommerceProductStatus)
  status?: CommerceProductStatus;
}

export class UpdateProductDto {
  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  sku?: string;

  @IsOptional()
  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5_000_000)
  imageUrl?: string | null;

  @IsOptional()
  @Transform(toOptionalNullableNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Transform(toOptionalNullableNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  resellerPrice?: number | null;

  @IsOptional()
  @Transform(toOptionalNullableNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  wholesalePrice?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/)
  currency?: string;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  availableToResellers?: boolean;

  @IsOptional()
  @IsEnum(CommerceProductStatus)
  status?: CommerceProductStatus;
}

export class RecordProductMovementDto {
  @IsEnum(['ENTRY', 'EXIT', 'ADJUSTMENT'])
  type!: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

  @Type(() => Number)
  @IsInt()
  quantityDelta!: number;

  @IsOptional()
  @Transform(toOptionalNullableNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string | null;
}
