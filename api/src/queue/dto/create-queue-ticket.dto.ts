import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { QueueTicketKind } from '@prisma/client';

export class CreateQueueTicketDto {
    @IsNotEmpty()
    @IsEnum(QueueTicketKind)
    kind!: QueueTicketKind;

    @IsNotEmpty()
    @IsString()
    customerName!: string;

    @IsOptional()
    @IsString()
    customerPhone?: string;

    @IsOptional()
    @IsEmail()
    customerEmail?: string;

    @IsOptional()
    @IsArray()
    recommendationIds?: string[];
}
