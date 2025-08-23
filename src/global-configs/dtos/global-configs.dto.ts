import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
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

export class CreateGlobalConfigsDto {
  @IsNotEmpty()
  @Type(() => ProfitMarginDto)
  readonly profitMargin: ProfitMarginDto;
}

export class UpdateGlobalConfigsDto extends PartialType(
  CreateGlobalConfigsDto,
) {
  @IsString()
  @IsNotEmpty()
  readonly profitMarginId: string;
}
