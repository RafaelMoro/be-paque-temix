import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class GetQuoteDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '72000', description: 'Postal code of the origin' })
  readonly originPostalCode: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '94298',
    description: 'Postal code of the destination',
  })
  readonly destinationPostalCode: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({ example: 5 })
  readonly weight: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({ example: 30 })
  readonly length: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({ example: 20 })
  readonly height: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({ example: 10 })
  readonly width: number;
}
