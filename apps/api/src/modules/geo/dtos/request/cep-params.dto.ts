import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class CepParamsDto {
  @ApiProperty({ example: '01310100', description: '8 digits, no mask' })
  @Matches(/^\d{8}$/, { message: 'cep deve ter 8 dígitos' })
  cep!: string;
}
