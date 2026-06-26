import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetGuidesQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['GE', 'TONE', 'Pkk', 'Mn'])
  provider?: 'GE' | 'TONE' | 'Pkk' | 'Mn';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

export class GetAdminGuidesQueryDto extends GetGuidesQueryDto {
  @ApiProperty({ enum: ['all', 'own'], required: true })
  @IsEnum(['all', 'own'])
  scope: 'all' | 'own';

  @ApiProperty({ required: false, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  month?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  year?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}


export class CreateGuideAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  alias: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  street1: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  street2?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  isResidential?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  external_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  town: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  zipcode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reference: string;
}

export class ParcelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  length: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  width: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  height: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  weight: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  satProductId: string;

  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiProperty()
  @IsNumber()
  quantity: number;
}

export class CreateGuideDto {
  @ApiProperty({ enum: ['GE', 'TONE', 'Pkk', 'Mn'] })
  @IsEnum(['GE', 'TONE', 'Pkk', 'Mn'])
  provider: 'GE' | 'TONE' | 'Pkk' | 'Mn';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  quoteId: string;

  @ApiProperty({ type: ParcelDto })
  @ValidateNested()
  @Type(() => ParcelDto)
  parcel: ParcelDto;

  @ApiProperty({ type: CreateGuideAddressDto })
  @ValidateNested()
  @Type(() => CreateGuideAddressDto)
  origin: CreateGuideAddressDto;

  @ApiProperty({ type: CreateGuideAddressDto })
  @ValidateNested()
  @Type(() => CreateGuideAddressDto)
  destination: CreateGuideAddressDto;

  @ApiProperty()
  @IsBoolean()
  notifyMe: boolean;
}

export class AddCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class UpdateGuideStatusDto {
  @ApiProperty({ enum: ['created', 'failed', 'waiting', 'in-transit', 'on-delivery', 'delivered', 'returned', 'exception'] })
  @IsEnum(['created', 'failed', 'waiting', 'in-transit', 'on-delivery', 'delivered', 'returned', 'exception'])
  status: 'created' | 'failed' | 'waiting' | 'in-transit' | 'on-delivery' | 'delivered' | 'returned' | 'exception';
}
