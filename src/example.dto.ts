import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVideogameDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly price: string;
}
