import { ApiProperty } from '@nestjs/swagger';

export class CityResponseDto {
  @ApiProperty({ example: 3550308, description: 'IBGE code' })
  id!: number;

  @ApiProperty({ example: 'São Paulo' })
  name!: string;

  @ApiProperty({ example: 'SP' })
  uf!: string;

  @ApiProperty({ example: -23.5329 })
  lat!: number;

  @ApiProperty({ example: -46.6395 })
  lng!: number;
}
