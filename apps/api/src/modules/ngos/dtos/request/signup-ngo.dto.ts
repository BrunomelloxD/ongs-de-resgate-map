import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsCnpj } from '@/common/validation/cnpj.js';
import { NgoProfileDto } from './ngo-profile.dto.js';

export class SignupNgoDto extends NgoProfileDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Gerado uma vez por assistente; repetir não cria outra ONG',
  })
  @IsUUID()
  signupRequestId!: string;

  @ApiProperty({
    example: '12ABC34501DE35',
    description: '14 caracteres, maiúsculas, sem máscara',
  })
  @IsString()
  @IsCnpj()
  cnpj!: string;

  @ApiProperty({ minLength: 8, example: 'senha1234' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  // SIGN-15: at least one letter and one number.
  @Matches(/\p{L}/u, { message: 'A senha precisa de ao menos uma letra.' })
  @Matches(/\d/, { message: 'A senha precisa de ao menos um número.' })
  password!: string;

  @ApiProperty({ example: true, description: 'Termos e privacidade (SIGN-27)' })
  @Equals(true)
  termsAccepted!: true;
}
