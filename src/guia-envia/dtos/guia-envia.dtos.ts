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

export class NeighborhoodDto {
  @ApiProperty({ example: 'Centro' })
  neighborhood: string;

  @ApiProperty({ example: '72000' })
  zipcode: string;

  @ApiProperty({ example: 'Puebla' })
  state: string;

  @ApiProperty({ example: 'Heroica Puebla de Zaragoza' })
  city: string;
}

export class GetAddressInfoDataDto {
  @ApiProperty({ type: [NeighborhoodDto] })
  neighborhoods: NeighborhoodDto[];
}

export class GetAddressInfoResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({
    type: [String],
    example: ['Address information fetched successfully'],
  })
  messages: string[];

  @ApiProperty({
    type: GetAddressInfoDataDto,
  })
  data: GetAddressInfoDataDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
