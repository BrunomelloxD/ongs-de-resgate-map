import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GeocodeAddressDto {
  @ApiProperty({
    example: 'Avenida Paulista, 1000, Bela Vista, São Paulo - SP',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address!: string;
}
