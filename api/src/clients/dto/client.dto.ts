import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ClientType } from '@prisma/client';

export class PortalAccessDto {
  @IsOptional()
  @IsBoolean()
  enable?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9._-]{3,30}$/)
  username?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password?: string;
}

class ClientFieldsDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  location?: string | null;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PortalAccessDto)
  portalAccess?: PortalAccessDto;
}

export class CreateClientDto extends ClientFieldsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  name!: string;
}

export class UpdateClientDto extends ClientFieldsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  name?: string;
}
