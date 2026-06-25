import { ApiProperty } from '@nestjs/swagger';

export class GuideDataDto {
  @ApiProperty()
  kraftId: string;

  @ApiProperty({ required: false })
  externalId?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  isProviderTrackingSynced: boolean;

  @ApiProperty({ required: false })
  labelUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  failureInfo?: {
    errorDetails: string;
    errorCode: string;
    timestamp: Date;
  };
}

export class GuideResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ required: false })
  message: string | null;

  @ApiProperty({ required: false })
  error: string | null;

  @ApiProperty({ type: GuideDataDto })
  data: GuideDataDto;
}

export class PaginatedGuidesDataDto {
  @ApiProperty({ type: [GuideDataDto] })
  guides: GuideDataDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class PaginatedGuidesResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ required: false })
  message: string | null;

  @ApiProperty({ required: false })
  error: string | null;

  @ApiProperty({ type: PaginatedGuidesDataDto })
  data: PaginatedGuidesDataDto;
}
