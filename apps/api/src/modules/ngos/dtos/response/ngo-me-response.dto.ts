import { ApiProperty } from '@nestjs/swagger';
import { AddressDto, DayHoursDto } from './ngo-public-response.dto.js';

/** The NGO's own data (PROF-01). Only for its session, never public. */
export class NgoMeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'patas-do-bairro' })
  slug!: string;

  @ApiProperty({ example: '11222333000181', description: 'Somente leitura' })
  cnpj!: string;

  @ApiProperty({ example: 'Patas do Bairro' })
  legalName!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '/img/ngos/{ngoId}/logo/{id}-600.webp',
  })
  imageUrl!: string | null;

  @ApiProperty({ example: 'contato@patas.org' })
  email!: string;

  @ApiProperty({ example: '5511987654321' })
  whatsapp!: string;

  @ApiProperty({ type: AddressDto })
  address!: AddressDto;

  @ApiProperty({ example: -23.5869 })
  lat!: number;

  @ApiProperty({ example: -46.6347 })
  lng!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  locationConfirmedAt!: Date;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ type: DayHoursDto, isArray: true, description: '7 dias' })
  weekHours!: DayHoursDto[];

  @ApiProperty()
  openNow!: boolean;

  @ApiProperty({ example: 1 })
  todayIndex!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Data da exclusão automática da demo (DEMO-06)',
  })
  expiresAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
