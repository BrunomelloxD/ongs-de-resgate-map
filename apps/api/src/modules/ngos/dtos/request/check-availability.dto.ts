import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { IsCnpj } from '@/common/validation/cnpj.js';

export class CheckCnpjDto {
  @ApiProperty({ example: '12ABC34501DE35' })
  @IsString()
  @IsCnpj()
  cnpj!: string;
}

export class CheckEmailDto {
  @ApiProperty({ example: 'contato@patas.org' })
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
