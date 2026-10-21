import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SignupNgoDto } from '@/modules/ngos/dtos/request/signup-ngo.dto.js';

export class LoginDto {
  @ApiProperty({ example: 'contato@patas.org' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // No password rules here: the login only compares (AUTH-03).
  @ApiProperty({ example: 'senha1234' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class RequestPasswordResetDto extends PickType(LoginDto, [
  'email',
] as const) {}

/** Same rules as the signup password (SIGN-15). */
export class ResetPasswordDto extends PickType(SignupNgoDto, [
  'password',
] as const) {}

export class ChangePasswordDto extends ResetPasswordDto {
  @ApiProperty({ description: 'Senha atual (PROF-06)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;
}
