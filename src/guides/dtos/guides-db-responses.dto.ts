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

  @ApiProperty({ required: false, nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  deletedBy?: string | null;

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

export class DeleteGuideDataDto {
  @ApiProperty({ example: 'KFT-202606-000001' })
  kraftId: string;
}

export class DeleteGuideDataWrapperDto {
  @ApiProperty({ type: DeleteGuideDataDto })
  guide: DeleteGuideDataDto;
}

export class DeleteGuideResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: string | null;

  @ApiProperty({ type: DeleteGuideDataWrapperDto })
  data: DeleteGuideDataWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
