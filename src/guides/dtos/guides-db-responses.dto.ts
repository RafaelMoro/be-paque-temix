import { ApiProperty } from '@nestjs/swagger';
import { ProviderSource } from '@/global.interface';

export class GuideDataDto {
  @ApiProperty()
  kraftId: string;

  @ApiProperty({ required: false })
  externalId?: string | null; // this is the tracking number that the provider returns

  @ApiProperty({ required: false, nullable: true })
  shipmentNumber?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ enum: ['GE', 'TONE', 'Pkk', 'Mn'] })
  provider: ProviderSource;

  @ApiProperty({ enum: ['GE', 'TONE', 'Pkk', 'Mn'] })
  source: ProviderSource;

  @ApiProperty({ required: false, nullable: true })
  carrier: string | null = null;

  @ApiProperty({ required: false, nullable: true })
  price: string | null = null;

  @ApiProperty({ required: false, nullable: true })
  guideLink: string | null = null;

  @ApiProperty()
  isProviderTrackingSynced: boolean;

  @ApiProperty({ required: false })
  labelUrl?: string | null;

  @ApiProperty({ required: false, nullable: true })
  file: string | null = null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  failureInfo?: {
    errorDetails: string;
    errorCode: string;
    timestamp: Date;
  } | null;
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
