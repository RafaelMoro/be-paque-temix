import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { TypeProfitMargin } from '../global-configs.interface';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class ProfitMarginDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  value: number;

  @IsNotEmpty()
  @IsString()
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
