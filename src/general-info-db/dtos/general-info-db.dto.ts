import { IsNotEmpty, IsString, IsBoolean } from 'class-validator';

export class GeneralInfoDbDto {
  @IsString()
  @IsNotEmpty()
  readonly mnTk: string;
}

export class UpdateMnTokenDto {
  @IsString()
  @IsNotEmpty()
  readonly token: string;

  @IsBoolean()
  readonly isProd: boolean;
}
