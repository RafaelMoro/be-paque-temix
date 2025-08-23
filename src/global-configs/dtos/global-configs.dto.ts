import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { TypeProfitMargin } from '../global-configs.interface';
import { Type } from 'class-transformer';

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
