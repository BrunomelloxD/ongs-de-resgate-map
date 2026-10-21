import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SearchCitiesDto {
  @ApiProperty({
    example: 'sao paulo',
    description: 'Fewer than 3 characters returns an empty list',
  })
  @IsString()
  @MaxLength(100)
  q!: string;
}
