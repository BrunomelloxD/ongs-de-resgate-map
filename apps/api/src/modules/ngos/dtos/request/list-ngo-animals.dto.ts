import { ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '@/common/dtos/request/pagination.dto.js';
import { Sex, Size, Species } from '@/generated/prisma/enums.js';

/** Query strings carry text: "true"/"false" become booleans, the rest fails validation. */
export function parseBooleanQuery(value: unknown): unknown {
  if (value === 'true') {
    return true;
  }
  return value === 'false' ? false : value;
}

/** The page size is fixed at 12 (NGO-10), so only `page` comes from PaginationDto. */
export class ListNgoAnimalsDto extends PickType(PaginationDto, [
  'page',
] as const) {
  @ApiPropertyOptional({ enum: Species, enumName: 'Species' })
  @IsOptional()
  @IsEnum(Species)
  species?: Species;

  @ApiPropertyOptional({ enum: Sex, enumName: 'Sex' })
  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @ApiPropertyOptional({ enum: Size, enumName: 'Size' })
  @IsOptional()
  @IsEnum(Size)
  size?: Size;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description: '"Só disponíveis" (NGO-05, NGO-07)',
  })
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  available: boolean = true;
}
