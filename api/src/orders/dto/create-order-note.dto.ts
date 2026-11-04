import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateOrderNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content!: string;
}
