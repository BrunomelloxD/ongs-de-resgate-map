import { ApiProperty } from '@nestjs/swagger';
import { NgoMeDto } from './ngo-me-response.dto.js';

export class SignupResponseDto {
  @ApiProperty({ description: 'Token da sessão; o web guarda no cookie' })
  token!: string;

  @ApiProperty({ type: NgoMeDto })
  ngo!: NgoMeDto;
}

export class AvailabilityResponseDto {
  @ApiProperty({ description: 'false quando já existe uma ONG com o valor' })
  available!: boolean;
}
