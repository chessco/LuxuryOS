import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsString() @IsNotEmpty() clientId!: string;
  @IsString() @IsNotEmpty() pieceType!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() @Min(0) laborCost?: number;
  @IsOptional() @IsNumber() @Min(0) materialCost?: number;
  @IsNumber() @Min(0) totalAmount!: number;
  @IsOptional() @IsDateString() validUntil?: string;
  /**
   * Datos de la pieza que todavía no entran al taller: metal, color, quilates,
   * medida, grosor, peso, código, imagen y cualquier detalle comercial.
   * Se conservan íntegros al convertir la cotización en una orden.
   */
  @IsOptional() specifications?: Record<string, unknown>;
}
