import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GeneralInfoDbDto {
  @IsString()
  @IsNotEmpty()
  readonly mnTk: string;
}

export class UpdateGeneralInfoDbDto extends PartialType(GeneralInfoDbDto) {}
