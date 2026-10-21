import { ApiProperty } from '@nestjs/swagger';
import { AgeUnit, Sex, Size, Species } from '@/generated/prisma/enums.js';

export class AnimalImageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '/img/ngos/{ngoId}/images/{id}-1200.webp' })
  url!: string;

  @ApiProperty({ example: '/img/ngos/{ngoId}/images/{id}-160.webp' })
  thumbUrl!: string;

  @ApiProperty({ example: 1200 })
  width!: number;

  @ApiProperty({ example: 900 })
  height!: number;

  @ApiProperty({ example: 'Mel, gato, porte pequeno', description: 'A11Y-11' })
  alt!: string;
}

/** Card of the NGO on the animal page; never e-mail or CNPJ (SEC-04). */
export class NgoSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'patas-do-bairro' })
  slug!: string;

  @ApiProperty({ example: 'Patas do Bairro' })
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '/img/ngos/{ngoId}/logo/{id}-160.webp',
  })
  imageUrl!: string | null;

  @ApiProperty({ example: 'São Paulo' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  uf!: string;
}

class AnimalBaseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Mel' })
  name!: string;

  @ApiProperty({ enum: Species, enumName: 'Species' })
  species!: Species;

  @ApiProperty({ type: String, nullable: true, example: 'SRD (vira-lata)' })
  breed!: string | null;

  @ApiProperty({ enum: Sex, enumName: 'Sex' })
  sex!: Sex;

  @ApiProperty({ enum: Size, enumName: 'Size' })
  size!: Size;

  @ApiProperty({ example: 2 })
  ageValue!: number;

  @ApiProperty({ enum: AgeUnit, enumName: 'AgeUnit' })
  ageUnit!: AgeUnit;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  available!: boolean;

  @ApiProperty({
    type: [AnimalImageDto],
    description: 'A capa (ordem 0) vem primeiro (ANI-02)',
  })
  images!: AnimalImageDto[];
}

/** GET /animals/:id (ANI-01 to ANI-05). */
export class AnimalPublicDto extends AnimalBaseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'wa.me com a mensagem pronta; null se indisponível (ANI-04)',
  })
  whatsappUrl!: string | null;

  @ApiProperty({ type: NgoSummaryDto })
  ngo!: NgoSummaryDto;
}

/** Animal of the NGO's own dashboard and form (DASH-01, AFORM-13). */
export class AnimalMeDto extends AnimalBaseDto {
  @ApiProperty({ description: 'DASH-02' })
  availableChangedAt!: Date;

  @ApiProperty()
  createdAt!: Date;
}
