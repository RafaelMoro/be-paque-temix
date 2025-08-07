import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '5.0' })
  readonly weight: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '30' })
  readonly length: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '20' })
  readonly height: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '10' })
  readonly width: string;
}
