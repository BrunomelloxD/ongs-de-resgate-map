import { ApiProperty } from '@nestjs/swagger';
import { AgeUnit, Sex, Size, Species } from '@/generated/prisma/enums.js';

export class AnimalCoverDto {
  @ApiProperty({ example: '/img/ngos/{ngoId}/images/{id}-1200.webp' })
  url!: string;

  @ApiProperty({ example: '/img/ngos/{ngoId}/images/{id}-160.webp' })
  thumbUrl!: string;

  @ApiProperty({ example: 1200 })
  width!: number;

  @ApiProperty({ example: 900 })
  height!: number;

  @ApiProperty({ example: 'Mel, gato, porte pequeno' })
  alt!: string;
}

/** Card of the NGO page grid (NGO-05 to NGO-10). */
export class NgoAnimalDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Mel' })
  name!: string;

  @ApiProperty({ enum: Species, enumName: 'Species' })
  species!: Species;

  @ApiProperty({ enum: Sex, enumName: 'Sex' })
  sex!: Sex;

  @ApiProperty({ enum: Size, enumName: 'Size' })
  size!: Size;

  @ApiProperty({ example: 2 })
  ageValue!: number;

  @ApiProperty({ enum: AgeUnit, enumName: 'AgeUnit' })
  ageUnit!: AgeUnit;

  @ApiProperty()
  available!: boolean;

  @ApiProperty({ type: AnimalCoverDto, nullable: true, description: 'ANI-02' })
  cover!: AnimalCoverDto | null;
}
