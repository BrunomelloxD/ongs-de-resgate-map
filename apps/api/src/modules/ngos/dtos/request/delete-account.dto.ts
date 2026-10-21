import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Senha atual (PROF-07)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
