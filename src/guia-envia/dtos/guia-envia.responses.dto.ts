import { ApiProperty } from '@nestjs/swagger';

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
