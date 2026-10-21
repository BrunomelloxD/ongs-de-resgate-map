import { ApiProperty } from '@nestjs/swagger';

export class DayHoursDto {
  @ApiProperty({ example: 1, description: '0 = domingo' })
  dayOfWeek!: number;

  @ApiProperty({ example: false })
  closed!: boolean;

  @ApiProperty({ type: String, example: '09:00', nullable: true })
  opensAt!: string | null;

  @ApiProperty({ type: String, example: '18:00', nullable: true })
  closesAt!: string | null;
}

export class AddressDto {
  @ApiProperty({ example: '04101300' })
  cep!: string;

  @ApiProperty({ example: 'Rua Vergueiro' })
  street!: string;

  @ApiProperty({ example: '3000' })
  number!: string;

  @ApiProperty({ type: String, example: 'Sala 2', nullable: true })
  complement!: string | null;

  @ApiProperty({ example: 'Vila Mariana' })
  district!: string;

  @ApiProperty({ example: 'São Paulo' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  uf!: string;
}

/** NGO-01. Never e-mail, CNPJ or password hash (SEC-04). */
export class NgoPublicDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'patas-do-bairro' })
  slug!: string;

  @ApiProperty({ example: 'Patas do Bairro' })
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '/img/ngos/{ngoId}/logo/{id}-600.webp',
  })
  imageUrl!: string | null;

  @ApiProperty({ example: 'https://wa.me/5511987654321?text=...' })
  whatsappUrl!: string;

  @ApiProperty({ type: AddressDto })
  address!: AddressDto;

  @ApiProperty({ example: -23.5869 })
  lat!: number;

  @ApiProperty({ example: -46.6347 })
  lng!: number;

  @ApiProperty()
  openNow!: boolean;

  @ApiProperty({ type: DayHoursDto, isArray: true, description: '7 dias' })
  weekHours!: DayHoursDto[];

  @ApiProperty({ example: 1, description: 'Dia de hoje no fuso da ONG' })
  todayIndex!: number;

  @ApiProperty({ description: 'Tem ao menos um animal cadastrado (NGO-08)' })
  hasAnimals!: boolean;
}
