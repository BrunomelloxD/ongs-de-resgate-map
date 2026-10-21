import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppConfigService } from '@/common/config/app-config.service.js';
import { PasswordHasher } from '@/common/crypto/password-hasher.js';
import { PaginatedResponseDto } from '@/common/dtos/response/paginated-response.dto.js';
import { withAdvisoryLock } from '@/common/prisma/advisory-lock.js';
import { slugify } from '@/common/text/slugify.js';
import { Prisma } from '@/generated/prisma/client.js';
import type { Ngo } from '@/generated/prisma/client.js';
import type { Sex, Size, Species } from '@/generated/prisma/enums.js';
import { DemoQuotaService } from '@/modules/demo/services/demo-quota.service.js';
import {
  MediaService,
  type UploadedImage,
} from '@/modules/media/services/media.service.js';
import { SessionsService } from '@/modules/sessions/services/sessions.service.js';
import type { NgoAnimalDto } from '../dtos/response/ngo-animal-response.dto.js';
import type { NgoMeDto } from '../dtos/response/ngo-me-response.dto.js';
import type { NgoSearchResponseDto } from '../dtos/response/ngo-pin-response.dto.js';
import type { NgoPublicDto } from '../dtos/response/ngo-public-response.dto.js';
import { NgoMapper } from '../mappers/ngo.mapper.js';
import {
  type Bbox,
  INgosRepository,
  type NgoPublicRecord,
  type NgoWithHours,
} from '../repositories/ngos.repository.interface.js';
import type { DayHours } from './open-status.js';
import { timezoneForUf } from './timezone-for-uf.js';

/** NGO-10: the grid has 12 animals per page. */
export const ANIMALS_PAGE_SIZE = 12;

export interface AnimalListFilters {
  species?: Species;
  sex?: Sex;
  size?: Size;
  available?: boolean;
}

/** Profile fields, the same in the signup and in the profile edit. */
export interface NgoProfileInput {
  legalName: string;
  description: string;
  email: string;
  whatsapp: string;
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  uf: string;
  lat: number;
  lng: number;
  locationConfirmedAt: Date;
  openingHours: DayHours[];
}

export interface NgoSignupInput extends NgoProfileInput {
  /** Generated once per signup wizard (SIGN-32). */
  signupRequestId: string;
  cnpj: string;
  password: string;
}

/** PROF-02: never the CNPJ; the password has its own route. */
export type NgoProfileUpdate = Partial<NgoProfileInput>;

export interface SignupResult {
  token: string;
  ngo: NgoMeDto;
}

/** Version of the accepted terms (RF-28). */
export const TERMS_VERSION = '2026-10-demo';

const DAY_MS = 24 * 60 * 60 * 1000;

const CONFLICT_MESSAGES = {
  // SIGN-05
  cnpj: 'Este CNPJ já tem cadastro. Entre com o e-mail da ONG ou recupere a senha.',
  // SPEC_DEVIATION: the spec gives no text for the e-mail (SIGN-12 only names the shortcuts).
  // Reason: the 409 needs a message; the web shows the shortcuts next to it.
  email: 'Este e-mail já tem cadastro.',
};

// Unique index → field. The driver adapter reports the index, not meta.target.
const UNIQUE_INDEXES = {
  ngos_cnpj_key: 'cnpj',
  ngos_email_key: 'email',
  ngos_signup_request_id_key: 'signupRequestId',
} as const;

type UniqueField = (typeof UNIQUE_INDEXES)[keyof typeof UNIQUE_INDEXES];

function uniqueViolation(error: unknown): UniqueField | undefined {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return undefined;
  }
  const meta = JSON.stringify(error.meta ?? {});
  return Object.entries(UNIQUE_INDEXES).find(([index]) =>
    meta.includes(index),
  )?.[1];
}

/** SIGN-31 and the profile e-mail: 409 with the field of the conflict. */
function conflictOn(error: unknown): ConflictException | undefined {
  const field = uniqueViolation(error);
  if (field !== 'cnpj' && field !== 'email') {
    return undefined;
  }
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    message: CONFLICT_MESSAGES[field],
    field,
  });
}

// PROF-03: changing any of these asks for the pin again.
const ADDRESS_FIELDS = ['cep', 'street', 'number', 'city', 'uf'] as const;

/** SIGN-29: `base`, or the first free `base-2`, `base-3`… */
export function nextSlug(base: string, taken: readonly string[]): string {
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

@Injectable()
export class NgosService {
  constructor(
    private readonly ngos: INgosRepository,
    private readonly sessions: SessionsService,
    private readonly quota: DemoQuotaService,
    private readonly hasher: PasswordHasher,
    private readonly config: AppConfigService,
    private readonly media: MediaService,
  ) {}

  /** MAP-02, MAP-18, MAP-20: active NGOs, with or without animals. */
  async search(
    bbox: Bbox,
    species: readonly Species[],
  ): Promise<NgoSearchResponseDto> {
    const { items, truncated } = await this.ngos.searchByBbox(bbox, species);
    const now = new Date();
    return { items: items.map((ngo) => NgoMapper.toPin(ngo, now)), truncated };
  }

  async getBySlug(slug: string): Promise<NgoPublicDto> {
    return NgoMapper.toPublic(await this.findActive(slug), new Date());
  }

  async listAnimals(
    slug: string,
    filters: AnimalListFilters,
    page: number,
  ): Promise<PaginatedResponseDto<NgoAnimalDto>> {
    const ngo = await this.findActive(slug);
    const { items, total } = await this.ngos.findAnimals(
      ngo.id,
      // NGO-05: "Só disponíveis" starts on.
      { ...filters, available: filters.available ?? true },
      { skip: (page - 1) * ANIMALS_PAGE_SIZE, take: ANIMALS_PAGE_SIZE },
    );
    return PaginatedResponseDto.create(
      items.map((animal) => NgoMapper.toAnimal(animal)),
      total,
      { page, limit: ANIMALS_PAGE_SIZE },
    );
  }

  /**
   * SIGN-28: an ACTIVE NGO with its 7 days and a session. The quotas run in
   * the same transaction, after the quota:ngos lock (AD-004, DEMO-13).
   */
  async signup(input: NgoSignupInput, ipHash: string): Promise<SignupResult> {
    const sent = await this.ngos.findBySignupRequestId(input.signupRequestId);
    if (sent) {
      return this.resumeSignup(sent, input.password);
    }

    // Hashed before the transaction: argon2 is slow and the lock is shared.
    const passwordHash = await this.hasher.hash(input.password);
    const now = new Date();
    const demo = this.config.demo;
    const { openingHours, password: _password, ...fields } = input;

    let ngo: NgoWithHours;
    try {
      ngo = await this.ngos.transaction(async (tx) => {
        await this.quota.assertCanCreateNgo(tx, ipHash);
        const base = slugify(input.legalName);
        // Two signups with the same name would pick the same suffix.
        await withAdvisoryLock(tx, `slug:${base}`);
        const taken = await this.ngos.findSlugsStartingWith(tx, base);
        return this.ngos.create(
          tx,
          {
            ...fields,
            slug: nextSlug(base, taken),
            passwordHash,
            timezone: timezoneForUf(input.uf),
            status: 'ACTIVE',
            isSeed: false,
            termsAcceptedAt: now,
            termsVersion: TERMS_VERSION,
            signupIpHash: ipHash,
            createdAt: now,
            // DEMO-04 and DEMO-20.
            expiresAt: demo.enabled
              ? new Date(now.getTime() + demo.retentionDays * DAY_MS)
              : null,
          },
          openingHours,
        );
      });
    } catch (error) {
      if (uniqueViolation(error)) {
        // The same submission may have won a race against this one; its
        // CNPJ or e-mail index can fire before the signup_request_id one.
        const winner = await this.ngos.findBySignupRequestId(
          input.signupRequestId,
        );
        if (winner) {
          return this.resumeSignup(winner, input.password);
        }
      }
      // SIGN-31: the web goes back to the step of this field.
      throw conflictOn(error) ?? error;
    }

    const { token } = await this.sessions.create(ngo.id);
    return { token, ngo: NgoMapper.toMe(ngo, now) };
  }

  async getMe(ngoId: string): Promise<NgoMeDto> {
    return NgoMapper.toMe(await this.findOwn(ngoId), new Date());
  }

  /** PROF-04. `expiresAt` is never part of the update (DEMO-05). */
  async updateMe(ngoId: string, input: NgoProfileUpdate): Promise<NgoMeDto> {
    const current = await this.findOwn(ngoId);
    const addressChanged = ADDRESS_FIELDS.some(
      (field) => input[field] !== undefined && input[field] !== current[field],
    );
    const pinConfirmedAgain =
      input.locationConfirmedAt !== undefined &&
      input.locationConfirmedAt > current.locationConfirmedAt;
    if (addressChanged && !pinConfirmedAgain) {
      // SPEC_DEVIATION: PROF-03 has no message; this is the api's 400 text.
      // Reason: the web blocks saving before this; the api only enforces it.
      throw new BadRequestException(
        'Confirme a localização no mapa antes de salvar.',
      );
    }

    const { openingHours, ...fields } = input;
    try {
      const ngo = await this.ngos.update(
        ngoId,
        // A new state means a new timezone (edge case: UF changed).
        input.uf ? { ...fields, timezone: timezoneForUf(input.uf) } : fields,
        openingHours,
      );
      return NgoMapper.toMe(ngo, new Date());
    } catch (error) {
      throw conflictOn(error) ?? error;
    }
  }

  /** SIGN-09: replaces the NGO image. */
  async updateImage(
    ngoId: string,
    file: UploadedImage | undefined,
  ): Promise<NgoMeDto> {
    await this.media.uploadNgoImage(ngoId, file);
    return this.getMe(ngoId);
  }

  /**
   * PROF-08: the bucket prefix goes first. If it fails, the 503 leaves the
   * database untouched, so the NGO can try again.
   */
  async deleteAccount(ngoId: string, password: string): Promise<void> {
    const ngo = await this.findOwn(ngoId);
    if (!(await this.hasher.verify(ngo.passwordHash, password))) {
      throw new ForbiddenException('Senha atual incorreta.');
    }
    await this.media.deleteNgoPrefix(ngoId);
    await this.ngos.delete(ngoId);
  }

  /** SIGN-05: the step blocks before the final submission. */
  async isCnpjAvailable(cnpj: string): Promise<boolean> {
    return !(await this.ngos.existsByCnpj(cnpj));
  }

  /** SIGN-12. */
  async isEmailAvailable(email: string): Promise<boolean> {
    return !(await this.ngos.existsByEmail(email));
  }

  /** For the login (auth module): includes the hash, never leaves the api. */
  findByEmailForAuth(email: string): Promise<Ngo | null> {
    return this.ngos.findByEmail(email);
  }

  /** For the password change (auth module): includes the hash. */
  findByIdForAuth(ngoId: string): Promise<Ngo | null> {
    return this.ngos.findById(ngoId);
  }

  async updatePassword(ngoId: string, password: string): Promise<void> {
    const passwordHash = await this.hasher.hash(password);
    await this.ngos.update(ngoId, { passwordHash });
  }

  /** SIGN-32: a repeated submission gets the NGO it already created. */
  private async resumeSignup(
    ngo: NgoWithHours,
    password: string,
  ): Promise<SignupResult> {
    if (!(await this.hasher.verify(ngo.passwordHash, password))) {
      // SPEC_DEVIATION: the spec has no text for a reused id with another password.
      // Reason: without the same password, the request cannot take over that NGO.
      throw new ConflictException('Este cadastro já foi enviado.');
    }
    const { token } = await this.sessions.create(ngo.id);
    return { token, ngo: NgoMapper.toMe(ngo, new Date()) };
  }

  private async findOwn(ngoId: string): Promise<NgoWithHours> {
    const ngo = await this.ngos.findById(ngoId);
    if (!ngo) {
      throw new NotFoundException('ONG não encontrada.');
    }
    return ngo;
  }

  /** NGO-11: a missing slug and an inactive NGO look the same. */
  private async findActive(slug: string): Promise<NgoPublicRecord> {
    const ngo = await this.ngos.findActiveBySlug(slug);
    if (!ngo) {
      throw new NotFoundException('ONG não encontrada.');
    }
    return ngo;
  }
}
