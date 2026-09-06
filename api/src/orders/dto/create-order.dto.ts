import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { OrderType, OrderStatus, Priority } from '@prisma/client';

export class CreateOrderDto {
    @IsNotEmpty()
    @IsString()
    clientId!: string;

    @IsNotEmpty()
    @IsString()
    pieceType!: string;

    @IsOptional()
    @IsEnum(OrderType)
    type?: OrderType;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    value!: number; // For backward compatibility / UI mapping

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    totalAmount!: number; // New field

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    cost!: number;

    @IsOptional()
    @IsEnum(Priority)
    priority?: Priority;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    metal?: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsString()
    karats?: string;

    @IsOptional()
    @IsString()
    weight?: string;

    @IsOptional()
    @IsString()
    size?: string;

    @IsOptional()
    @IsString()
    thickness?: string;

    @IsOptional()
    @IsString()
    itemCode?: string;

    @IsOptional()
    @IsNumber()
    laborCost?: number;

    @IsOptional()
    @IsNumber()
    materialCost?: number;

    @IsOptional()
    @IsString()
    createdById?: string;

    @IsOptional()
    specifications?: any; // JSON
}
