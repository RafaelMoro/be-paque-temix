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

export class CreateAddressDataGEDto {
  @ApiProperty({ example: '72000' })
  zipcode: string;

  @ApiProperty({ example: 'Centro' })
  neighborhood: string;

  @ApiProperty({ example: 'Heroica Puebla de Zaragoza' })
  city: string;

  @ApiProperty({ example: 'Puebla' })
  state: string;

  @ApiProperty({ example: 'Avenida Juárez' })
  street: string;

  @ApiProperty({ example: '123' })
  number: string;

  @ApiProperty({ example: 'Entre calle A y calle B, edificio azul' })
  reference: string;

  @ApiProperty({ example: 'Casa Principal' })
  alias: string;
}

export class CreateGuideResponseDtoGE {
  @ApiProperty({ example: '123456789' })
  trackingNumber: string;

  @ApiProperty({ example: 'Guia Envia' })
  carrier: string;

  @ApiProperty({ example: '350.50' })
  price: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'https://app.guiaenvia.com/guia/123456789',
    description: 'URL to view the guide online',
  })
  guideLink: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'https://app.guiaenvia.com/label/123456789.pdf',
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
  @ApiProperty({
    type: CreateGuideResponseDtoGE,
  })
  guide: CreateGuideResponseDtoGE;
}

export class CreateGuideGEResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({
    type: 'null',
    nullable: true,
    example: null,
    description: 'Error information if any',
  })
  error: null;

  @ApiProperty({
    type: [String],
    example: ['Guide created successfully'],
  })
  messages: string[];

  @ApiProperty({
    type: CreateGuideDataWrapperDto,
  })
  data: CreateGuideDataWrapperDto;
}

export class GetAliasesDataDto {
  @ApiProperty({
    type: [String],
    example: ['Casa Principal', 'Oficina Centro', 'Sucursal Norte'],
    description: 'List of address aliases saved in GE',
  })
  aliases: string[];
}

export class GetAliasesGEResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({
    type: 'null',
    nullable: true,
    example: null,
    description: 'Message information if any',
  })
  message: null;

  @ApiProperty({
    type: 'null',
    nullable: true,
    example: null,
    description: 'Error information if any',
  })
  error: null;

  @ApiProperty({
    type: GetAliasesDataDto,
  })
  data: GetAliasesDataDto;
}

export class CourierServiceDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Paquete Express' })
  nombre: string;
}

export class GetCourierServicesResponseDto {
  @ApiProperty({
    type: [CourierServiceDto],
    description: 'List of available courier services',
    example: [
      { id: '1', nombre: 'Paquete Express' },
      { id: '2', nombre: 'DHL' },
      { id: '3', nombre: 'FedEx' },
    ],
  })
  data: CourierServiceDto[];
}

export class DeleteAddressGEResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({
    type: 'string',
    example: 'Address deleted successfully',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    type: 'null',
    nullable: true,
    example: null,
    description: 'Error information if any',
  })
  error: null;

  @ApiProperty({
    type: 'null',
    nullable: true,
    example: null,
    description: 'Data information',
  })
  data: null;
}
