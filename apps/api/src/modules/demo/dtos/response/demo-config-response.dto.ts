import { ApiProperty } from '@nestjs/swagger';

export class DemoQuotasDto {
  @ApiProperty({ example: 30 })
  maxNgos!: number;

  @ApiProperty({ example: 2 })
  signupsPerIpPerDay!: number;

  @ApiProperty({ example: 10 })
  maxAnimalsPerNgo!: number;

  @ApiProperty({ example: 3, description: '8 when the demo is off' })
  maxImagesPerAnimal!: number;

  @ApiProperty({ example: 5, description: '10 when the demo is off' })
  maxUploadMb!: number;

  @ApiProperty({ example: 500 })
  maxStorageMb!: number;
}

export class DemoConfigResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: 7 })
  retentionDays!: number;

  @ApiProperty({ type: DemoQuotasDto })
  quotas!: DemoQuotasDto;
}
