import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TypeProfitMargin } from '../global-configs.interface';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class ProfitMarginDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1, {
    message: 'The value must be greater or equal to 1',
  })
  @ApiProperty({
    example: 13,
    description: 'Value of the profit margin',
  })
  value: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'percentage',
    description:
      'Type of the profit margin that could be percentage or absolute',
  })
  type: TypeProfitMargin;
}

export class CourierGCDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'DHL',
    description: 'Name of the courier',
  })
  name: string;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProfitMarginDto)
  profitMargin: ProfitMarginDto;
}

export class ProviderGCDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'Pkk',
    description: 'Name of the provider',
  })
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourierGCDto)
  couriers: CourierGCDto[];
}

export class CreateGlobalConfigsDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'global',
    description: 'The global config id',
  })
  configId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderGCDto)
  providers: ProviderGCDto[];

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProfitMarginDto)
  readonly globalMarginProfit: ProfitMarginDto;
}

export class UpdateGlobalConfigsDto extends PartialType(
  CreateGlobalConfigsDto,
) {}
