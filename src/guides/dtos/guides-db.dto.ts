import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
  Matches,
  IsEmail,
  Min,
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
}

export class GetAdminGuidesQueryDto extends GetGuidesQueryDto {
  @ApiProperty({ enum: ['all', 'own'], required: true })
  @IsEnum(['all', 'own'])
  scope: 'all' | 'own';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDeleted?: boolean = false;
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
  @Matches(/^\d{10}$/, { message: 'phone must be exactly 10 digits' })
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
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
  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  length: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  width: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  height: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  weight: number;

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
  @IsOptional()
  value: number = 1;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  quantity: number = 1;
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
  @IsOptional()
  notifyMe: boolean = false;
}

export class UpdateGuideDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  quoteId?: string;

  @ApiProperty({ required: false, type: ParcelDto })
  @ValidateNested()
  @Type(() => ParcelDto)
  @IsOptional()
  parcel?: ParcelDto;

  @ApiProperty({ required: false, type: CreateGuideAddressDto })
  @ValidateNested()
  @Type(() => CreateGuideAddressDto)
  @IsOptional()
  origin?: CreateGuideAddressDto;

  @ApiProperty({ required: false, type: CreateGuideAddressDto })
  @ValidateNested()
  @Type(() => CreateGuideAddressDto)
  @IsOptional()
  destination?: CreateGuideAddressDto;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  notifyMe?: boolean;
}

export class AddCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class UpdateGuideStatusDto {
  @ApiProperty({
    enum: [
      'created',
      'failed',
      'waiting',
      'in-transit',
      'on-delivery',
      'delivered',
      'returned',
      'exception',
    ],
  })
  @IsEnum([
    'created',
    'failed',
    'waiting',
    'in-transit',
    'on-delivery',
    'delivered',
    'returned',
    'exception',
  ])
  status:
    | 'created'
    | 'failed'
    | 'waiting'
    | 'in-transit'
    | 'on-delivery'
    | 'delivered'
    | 'returned'
    | 'exception';
}
