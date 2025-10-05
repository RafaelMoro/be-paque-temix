import { ApiProperty } from '@nestjs/swagger';

export class CreateGuideDataDto {
  @ApiProperty({ example: '794914961710' })
  trackingNumber: string;

  @ApiProperty({ example: 'Estafeta' })
  carrier: string;

  @ApiProperty({ example: '600.54' })
  price: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'URL to view the guide online',
  })
  guideLink: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example:
      'https://label-test-bucket-api.s3.us-west-2.amazonaws.com/uploads/manuable-575853230244848975-3Guvbdjkoic0EWdlh4J.pdf',
    description: 'URL to download the shipping label',
  })
  labelUrl: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Base64 encoded file content',
  })
  file: string | null;
}

export class CreateGuideDataWrapperDto {
  @ApiProperty({ type: CreateGuideDataDto, nullable: true })
  guide: CreateGuideDataDto | null;
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
