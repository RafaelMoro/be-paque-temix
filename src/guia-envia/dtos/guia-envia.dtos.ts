import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateGuideParcelDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '30', description: 'Length in centimeters' })
  readonly length: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '20', description: 'Width in centimeters' })
  readonly width: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '10', description: 'Height in centimeters' })
  readonly height: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '5.0', description: 'Weight in kilograms' })
  readonly weight: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Electronics', description: 'Content description' })
  readonly content: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '43211508', description: 'SAT product ID' })
  readonly satProductId: string;
}

export class CreateGuideAddressDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'warehouse-1', description: 'Address alias' })
  readonly alias: string;
}

export class CreateGuideGeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'quote-123', description: 'Quote ID' })
  readonly quoteId: string;

  @ValidateNested()
  @Type(() => CreateGuideParcelDto)
  @ApiProperty({
    type: CreateGuideParcelDto,
    description: 'Parcel information',
  })
  readonly parcel: CreateGuideParcelDto;

  @ValidateNested()
  @Type(() => CreateGuideAddressDto)
  @ApiProperty({
    type: CreateGuideAddressDto,
    description: 'Origin address',
  })
  readonly origin: CreateGuideAddressDto;

  @ValidateNested()
  @Type(() => CreateGuideAddressDto)
  @ApiProperty({
    type: CreateGuideAddressDto,
    description: 'Destination address',
  })
  readonly destination: CreateGuideAddressDto;
}
