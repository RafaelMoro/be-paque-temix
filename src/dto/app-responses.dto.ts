import { ApiProperty } from '@nestjs/swagger';

export class GetQuoteDataDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Estafetta Terrestre' })
  service: string;

  @ApiProperty({ example: 178.56 })
  total: number;

  @ApiProperty({ example: 'Pkk' })
  source: string;
}

export class GetQuoteDataWrapperDto {
  @ApiProperty({ type: [GetQuoteDataDto] })
  quotes: GetQuoteDataDto[];
}

export class GetQuoteResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({
    type: GetQuoteDataWrapperDto,
  })
  data: GetQuoteDataWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
