import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AgeUnit, Sex, Size, Species } from '@/generated/prisma/enums.js';
import {
  ANIMAL_FILTERS,
  type AnimalFilter,
} from '../../repositories/animals.repository.interface.js';

/** AFORM-07: with the demo off; DEMO_MAX_IMAGES_PER_ANIMAL is checked by media. */
export const MAX_IMAGES_PER_ANIMAL = 8;

export class CreateAnimalDto {
  @ApiProperty({ maxLength: 60, example: 'Mel' })
  @IsString()
  // AFORM-02: empty or blank names are rejected.
  @Matches(/\S/)
  @MaxLength(60)
  name!: string;

  @ApiProperty({ enum: Species, enumName: 'Species' })
  @IsEnum(Species)
  species!: Species;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 60,
    example: 'SRD (vira-lata)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  breed?: string | null;

  @ApiProperty({ enum: Sex, enumName: 'Sex' })
  @IsEnum(Sex)
  sex!: Sex;

  @ApiProperty({ enum: Size, enumName: 'Size' })
  @IsEnum(Size)
  size!: Size;

  @ApiProperty({ minimum: 0, maximum: 30, example: 2, description: 'AFORM-03' })
  @IsInt()
  @Min(0)
  @Max(30)
  ageValue!: number;

  @ApiProperty({ enum: AgeUnit, enumName: 'AgeUnit' })
  @IsEnum(AgeUnit)
  ageUnit!: AgeUnit;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 1000,
    description: 'AFORM-04',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: MAX_IMAGES_PER_ANIMAL,
    description:
      'Lista completa e ordenada das fotos; a primeira é a capa (AFORM-10, AFORM-11)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Adicione pelo menos 1 foto.' })
  @ArrayMaxSize(MAX_IMAGES_PER_ANIMAL)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  imageIds!: string[];
}

/** Only the fields sent change; `imageIds`, when sent, replaces the list. */
export class UpdateAnimalDto extends PartialType(CreateAnimalDto) {}

export class SetAvailabilityDto {
  @ApiProperty({ description: 'DASH-02' })
  @IsBoolean()
  available!: boolean;
}

export class PublicAnimalQueryDto {
  @ApiProperty({ example: 'patas-do-bairro', description: 'ANI-06' })
  @IsString()
  @MaxLength(160)
  slug!: string;
}

export class ListMyAnimalsDto {
  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Parte do nome, sem acento e sem caixa (DASH-04)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ANIMAL_FILTERS, default: 'all' })
  @IsOptional()
  @IsIn(ANIMAL_FILTERS)
  filter: AnimalFilter = 'all';
}
