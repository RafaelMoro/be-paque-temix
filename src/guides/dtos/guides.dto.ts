import { ApiProperty } from '@nestjs/swagger';

export class AddressGuideDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'Main Office' })
  alias: string;

  @ApiProperty({ example: 'Calle Principal' })
  street: string;

  @ApiProperty({ example: '123' })
  streetNumber: string;

  @ApiProperty({ example: 'Centro' })
  neighborhood: string;

  @ApiProperty({ example: 'Mexico City' })
  city: string;

  @ApiProperty({ example: 'CDMX' })
  state: string;
}

export class GetGuideDto {
  @ApiProperty({ example: '794914961710' })
  trackingNumber: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: '200e6cc0-33a6-11f1-91de-87f934bbe727',
    description: 'Shipment ID',
  })
  shipmentNumber: string | null;

  @ApiProperty({ example: 'Pkk' })
  source: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'Estafeta',
    description: 'Carrier name',
  })
  carrier: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: '450.75',
    description: 'Guide price',
  })
  price: string | null;

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
    example: null,
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

  @ApiProperty({ example: 'ON_DELIVERY' })
  status: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'REF-1775701234567',
    description: 'Order reference number',
  })
  order: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: '794914961710',
    description: 'Guide number',
  })
  guide: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Tracking link URL',
  })
  trackingLink: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Shipping document link URL',
  })
  shippingLink: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'Estafeta',
    description: 'Courier type',
  })
  courier: string | null;

  @ApiProperty({
    type: AddressGuideDto,
    nullable: true,
    description: 'Origin address information',
  })
  origin: AddressGuideDto | null;

  @ApiProperty({
    type: AddressGuideDto,
    nullable: true,
    description: 'Destination address information',
  })
  destination: AddressGuideDto | null;
}

export class GetGuidesDataWrapperDto {
  @ApiProperty({
    type: [GetGuideDto],
    description: 'Array of guides from all providers',
  })
  guides: GetGuideDto[];
}

export class GetGuidesResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'General message',
  })
  message: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Error information if any',
  })
  error: null;

  @ApiProperty({
    type: [String],
    example: ['GE failed to get guides', 'T1 failed to get guides'],
    description: 'Messages from different providers',
  })
  messages: string[];

  @ApiProperty({
    type: GetGuidesDataWrapperDto,
  })
  data: GetGuidesDataWrapperDto;
}
