import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const; // prettier-ignore

// Area codes in use in Brazil (Anatel).
const DDDS =
  '11|12|13|14|15|16|17|18|19|21|22|24|27|28|31|32|33|34|35|37|38|41|42|43|44|45|46|' +
  '47|48|49|51|53|54|55|61|62|63|64|65|66|67|68|69|71|73|74|75|77|79|81|82|83|84|85|' +
  '86|87|88|89|91|92|93|94|95|96|97|98|99';
/** SIGN-13/14: 55 + valid DDD + 8 or 9 digits, digits only. */
const WHATSAPP = new RegExp(`^55(${DDDS})\\d{8,9}$`);

export const CLOSING_BEFORE_OPENING_MESSAGE =
  'O horário de fechamento deve ser depois da abertura.';

/** SIGN-25: an open day closes after it opens ("HH:MM" compares in order). */
function ClosesAfterOpening(): PropertyDecorator {
  return ValidateBy({
    name: 'closesAfterOpening',
    validator: {
      // class-validator always passes the arguments to a property validator.
      validate: (closesAt: unknown, args) => {
        const day = args!.object as OpeningHoursDto;
        return day.closed || (closesAt as string) > (day.opensAt ?? '');
      },
      defaultMessage: () => CLOSING_BEFORE_OPENING_MESSAGE,
    },
  });
}

export class OpeningHoursDto {
  @ApiProperty({ example: 1, description: '0 = domingo' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  closed!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: '09:00' })
  @ValidateIf((day: OpeningHoursDto) => !day.closed || day.opensAt != null)
  @Matches(HH_MM, { message: 'Use o formato HH:MM.' })
  opensAt: string | null = null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '18:00' })
  @ValidateIf((day: OpeningHoursDto) => !day.closed || day.closesAt != null)
  @Matches(HH_MM, { message: 'Use o formato HH:MM.' })
  @ClosesAfterOpening()
  closesAt: string | null = null;
}

/** Fields shared by the signup and the profile edit (PROF-01). */
export class NgoProfileDto {
  @ApiProperty({ example: 'Patas do Bairro', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  legalName!: string;

  @ApiProperty({ minLength: 30, maxLength: 600 })
  @IsString()
  @Length(30, 600)
  description!: string;

  @ApiProperty({ example: 'contato@patas.org' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: '5511987654321', description: '55 + DDD + número' })
  @Matches(WHATSAPP, { message: 'WhatsApp inválido.' })
  whatsapp!: string;

  @ApiProperty({ example: '04101300' })
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos.' })
  cep!: string;

  @ApiProperty({ example: 'Rua Vergueiro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  street!: string;

  @ApiProperty({ example: '3000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  number!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Sala 2' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  complement?: string | null;

  @ApiProperty({ example: 'Vila Mariana' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  district!: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city!: string;

  @ApiProperty({ enum: UFS, example: 'SP' })
  @IsIn(UFS)
  uf!: string;

  @ApiProperty({ example: -23.5869 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: -46.6347 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Quando a ONG tocou "Confirmar localização" (SIGN-22, PROF-03)',
  })
  @Type(() => Date)
  @IsDate()
  locationConfirmedAt!: Date;

  @ApiProperty({ type: OpeningHoursDto, isArray: true, description: '7 dias' })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ArrayUnique((day: OpeningHoursDto) => day.dayOfWeek)
  @ValidateNested({ each: true })
  @Type(() => OpeningHoursDto)
  openingHours!: OpeningHoursDto[];
}
