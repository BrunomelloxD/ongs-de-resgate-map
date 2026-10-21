import { ApiProperty } from '@nestjs/swagger';

// SPEC_DEVIATION: design.md says `{ lat, lng } | null`.
// Reason: Nest sends an empty body for null, so `found` carries the "not found" case.
export class GeocodeResponseDto {
  @ApiProperty({ example: true })
  found!: boolean;

  @ApiProperty({ type: Number, nullable: true, example: -23.5613 })
  lat!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: -46.6565 })
  lng!: number | null;
}
