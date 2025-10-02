import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean } from 'class-validator';

export class GeneralInfoDbDto {
  @IsString()
  @IsNotEmpty()
  readonly mnTk: string;
}

export class UpdateGeneralInfoDbDto extends PartialType(GeneralInfoDbDto) {
  @IsString()
  @IsNotEmpty()
  readonly mnTkId: string;
}

export class UpdateMnTokenDto {
  @IsString()
  @IsNotEmpty()
  readonly token: string;

  @IsBoolean()
  readonly isProd: boolean;
}
