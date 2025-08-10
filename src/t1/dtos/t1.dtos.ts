import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class GetQuoteT1Dto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '72000', description: 'Postal code of the origin' })
  readonly codigo_postal_origen: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '94298',
    description: 'Postal code of the destination',
  })
  readonly codigo_postal_destino: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 5 })
  readonly peso: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 30 })
  readonly largo: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 20 })
  readonly alto: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 10 })
  readonly ancho: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 0 })
  readonly dias_embarque: number;

  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty({ example: false })
  readonly seguro: boolean;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 0 })
  readonly valor_paquete: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 0 })
  readonly tipo_paquete: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '123', description: 'Store id gotten from T1' })
  readonly comercio_id: string;
}
