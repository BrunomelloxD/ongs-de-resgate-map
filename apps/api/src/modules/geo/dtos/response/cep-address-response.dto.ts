import { ApiProperty } from '@nestjs/swagger';

export class CepAddressResponseDto {
  @ApiProperty({
    example: 'Avenida Paulista',
    description: 'Empty for city-wide CEPs',
  })
  street!: string;

  @ApiProperty({ example: 'Bela Vista' })
  district!: string;

  @ApiProperty({ example: 'São Paulo' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  uf!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: -23.5613,
    description: 'From the CEP, the street or the municipality center',
  })
  lat!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: -46.6565 })
  lng!: number | null;
}
