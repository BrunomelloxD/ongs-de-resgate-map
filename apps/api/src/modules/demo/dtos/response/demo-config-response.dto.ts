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

export class DemoAccountDto {
  @ApiProperty({ example: 'demo@animalhelper.example' })
  email!: string;

  @ApiProperty({
    example: 'Demo1234',
    description: 'Pública: aparece no /entrar',
  })
  password!: string;
}

export class MapStartDto {
  @ApiProperty({ example: -23.5651 })
  lat!: number;

  @ApiProperty({ example: -46.6519 })
  lng!: number;

  @ApiProperty({ enum: [5, 10, 25], example: 25 })
  radiusKm!: 5 | 10 | 25;
}

export class DemoConfigResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: 7 })
  retentionDays!: number;

  @ApiProperty({ type: DemoQuotasDto })
  quotas!: DemoQuotasDto;

  @ApiProperty({
    example: false,
    description: 'Demo fechada: conta compartilhada, sem cadastro (AD-008)',
  })
  locked!: boolean;

  @ApiProperty({
    type: DemoAccountDto,
    nullable: true,
    description: 'Credenciais da conta compartilhada; só com locked',
  })
  account!: DemoAccountDto | null;

  @ApiProperty({
    type: MapStartDto,
    nullable: true,
    description: 'Onde o mapa abre sem centro na URL; só com locked (DEP-22)',
  })
  mapStart!: MapStartDto | null;
}
