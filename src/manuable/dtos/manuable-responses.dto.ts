import { ApiProperty } from '@nestjs/swagger';

export class CreateGuideDataDto {
  @ApiProperty({ example: '1234-5678-91011' })
  token: string;

  @ApiProperty({ example: '794914961710' })
  tracking_number: string;

  @ApiProperty({ example: 'Fedex' })
  carrier: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  tracking_status: null;

  @ApiProperty({ example: '600.54' })
  price: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  waybill: null;

  @ApiProperty({
    example:
      'https://label-test-bucket-api.s3.us-west-2.amazonaws.com/uploads/manuable-575853230244848975-3Guvbdjkoic0EWdlh4J.pdf',
  })
  label_url: string;

  @ApiProperty({ type: 'boolean', example: true })
  cancellable: boolean;

  @ApiProperty({ example: '2025-09-16T19:59:57' })
  created_at: string;

  @ApiProperty({ example: 'generated' })
  label_status: string;
}

export class CreateGuideDataWrapperDto {
  @ApiProperty({ type: CreateGuideDataDto })
  guide: CreateGuideDataDto;
}

export class CreateGuideResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: [String], example: ['Quotes fetched successfully'] })
  messages: string[];

  @ApiProperty({
    type: CreateGuideDataWrapperDto,
  })
  data: CreateGuideDataWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}

export class GetHistoryGuideDataWrapperDto {
  @ApiProperty({ type: [CreateGuideDataDto] })
  guides: CreateGuideDataDto[];
}

export class GetHistoryGuidesResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({
    type: [String],
    example: [
      'Mn: Token valid',
      'Mn: Token expired, creating new token for guides fetching',
      'guides fetching completed successfully with new token',
    ],
  })
  messages: string[];

  @ApiProperty({
    type: GetHistoryGuideDataWrapperDto,
  })
  data: GetHistoryGuideDataWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
