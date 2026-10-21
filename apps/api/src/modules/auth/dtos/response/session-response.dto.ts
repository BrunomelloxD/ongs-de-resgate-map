import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({
    description: 'Token opaco; a api guarda só o SHA-256 (AUTH-14)',
  })
  token!: string;
}
