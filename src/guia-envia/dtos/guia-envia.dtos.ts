import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetQuoteGEDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '72000', description: 'Postal code of the origin' })
  readonly origen: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '94298',
    description: 'Postal code of the destination',
  })
  readonly destino: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '5.0' })
  readonly peso: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '30' })
  readonly largo: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '20' })
  readonly alto: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '10' })
  readonly ancho: string;
}
