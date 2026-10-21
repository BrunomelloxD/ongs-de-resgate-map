import { ApiProperty } from '@nestjs/swagger';

export class TodayHoursDto {
  @ApiProperty()
  closed!: boolean;

  @ApiProperty({ type: String, example: '09:00', nullable: true })
  opensAt!: string | null;

  @ApiProperty({ type: String, example: '18:00', nullable: true })
  closesAt!: string | null;
}

/** MAP-18: only these fields. */
export class NgoPinDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'patas-do-bairro' })
  slug!: string;

  @ApiProperty({ example: 'Patas do Bairro' })
  name!: string;

  @ApiProperty({ example: -23.5869 })
  lat!: number;

  @ApiProperty({ example: -46.6347 })
  lng!: number;

  @ApiProperty()
  openNow!: boolean;

  @ApiProperty({ type: TodayHoursDto, nullable: true })
  todayHours!: TodayHoursDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '/img/ngos/{ngoId}/logo/{id}-160.webp',
  })
  thumbUrl!: string | null;
}

export class NgoSearchResponseDto {
  @ApiProperty({ type: NgoPinDto, isArray: true })
  items!: NgoPinDto[];

  @ApiProperty({
    description: 'A bbox tem mais de 200 ONGs; vieram as mais próximas',
  })
  truncated!: boolean;
}
