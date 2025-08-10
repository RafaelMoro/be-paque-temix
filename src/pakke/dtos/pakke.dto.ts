import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class Parcel {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '5' })
  readonly Weight: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '20' })
  readonly Width: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '30' })
  readonly Height: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '20' })
  readonly Length: string;
}

export class GetQuotePakkeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '72000', description: 'Postal code of the origin' })
  readonly ZipCodeFrom: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '94298',
    description: 'Postal code of the destination',
  })
  readonly ZipCodeTo: string;

  @ValidateNested({ each: true })
  @Type(() => Parcel)
  readonly Parcel: Parcel;
}
