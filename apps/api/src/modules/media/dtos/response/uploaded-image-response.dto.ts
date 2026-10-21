import { ApiProperty } from '@nestjs/swagger';

/** Pending photo; saving the animal with its id confirms it (AFORM-10). */
export class UploadedImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: '160 px variant, relative to the web',
    example: '/img/ngos/{ngoId}/images/{id}-160.webp',
  })
  thumbUrl!: string;

  @ApiProperty({ description: 'Of the 1200 px variant', example: 1200 })
  width!: number;

  @ApiProperty({ description: 'Of the 1200 px variant', example: 900 })
  height!: number;
}
