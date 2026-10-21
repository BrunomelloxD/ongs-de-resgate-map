import { PartialType } from '@nestjs/swagger';
import { NgoProfileDto } from './ngo-profile.dto.js';

/** No `cnpj`: with forbidNonWhitelisted, sending it is a 400 (PROF-02). */
export class UpdateNgoDto extends PartialType(NgoProfileDto) {}
