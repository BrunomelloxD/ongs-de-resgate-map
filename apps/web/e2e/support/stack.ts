import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

// Talks to the Compose stack straight from the test runner (never a real SMTP).
const API_URL = `${process.env['E2E_API_URL'] ?? 'http://localhost:3333'}/api/v1`;
const MAILPIT_URL = `${process.env['E2E_MAILPIT_URL'] ?? 'http://localhost:8025'}/api/v1`;
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Same value the web sends (apps/web/.env), so the api accepts the calls (AD-002). */
function internalToken(): string {
  const fromEnv = process.env['INTERNAL_API_TOKEN'];
  if (fromEnv) return fromEnv;
  const env = parseEnv(readFileSync(`${ROOT}apps/web/.env`, 'utf8'));
  return env['INTERNAL_API_TOKEN'] ?? '';
}

/** A documentation-range IP per run, so no rate limit leaks between runs. */
export function newTestIp(): string {
  const [a, b] = randomBytes(2);
  return `198.18.${a}.${b}`;
}

interface ApiCall {
  method: string;
  ip: string;
  body: string;
  token?: string;
}

async function api(path: string, { method, ip, body, token }: ApiCall) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': internalToken(),
      'X-Client-IP': ip,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
  return response;
}

/** CNPJ check digits (mod 11, letters count as ASCII − 48). */
export function withCheckDigits(base: string): string {
  const digit = (value: string) => {
    let sum = 0;
    for (let i = 0; i < value.length; i++) {
      sum += (value.charCodeAt(i) - 48) * (((value.length - 1 - i) % 8) + 2);
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(base);
  return `${base}${first}${digit(`${base}${first}`)}`;
}

export interface TestNgo {
  email: string;
  password: string;
  /** Normalized: 14 characters, no mask. */
  cnpj?: string;
}

/** Signs up an NGO far from the seeds (Manaus), so the map journeys don't see it. */
export async function createNgo(
  ip: string,
  prefix = 'e2e-web-auth',
): Promise<TestNgo & { legalName: string }> {
  const id = randomUUID();
  const ngo = {
    legalName: `${prefix} ${id.slice(0, 8)}`,
    email: `${prefix}-${id.slice(0, 8)}@example.com`,
    password: 'senha1234',
    cnpj: withCheckDigits(
      `E2EW${String(randomBytes(4).readUInt32BE()).padStart(10, '0').slice(-8)}`,
    ),
  };
  await api('/ngos', {
    method: 'POST',
    ip,
    body: JSON.stringify({
      signupRequestId: id,
      cnpj: ngo.cnpj,
      password: ngo.password,
      termsAccepted: true,
      legalName: ngo.legalName,
      description:
        'ONG criada pelo e2e de autenticação do web, apagada no fim.',
      email: ngo.email,
      whatsapp: '5592987654321',
      cep: '69005070',
      street: 'Avenida Eduardo Ribeiro',
      number: '100',
      district: 'Centro',
      city: 'Manaus',
      uf: 'AM',
      lat: -3.1316,
      lng: -60.0233,
      locationConfirmedAt: new Date().toISOString(),
      openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        closed: false,
        opensAt: '09:00',
        closesAt: '18:00',
      })),
    }),
  });
  return ngo;
}

async function sessionToken(ngo: TestNgo, ip: string): Promise<string> {
  const session = await api('/auth/sessions', {
    method: 'POST',
    ip,
    body: JSON.stringify({ email: ngo.email, password: ngo.password }),
  });
  const { token } = (await session.json()) as { token: string };
  return token;
}

/** One-pixel PNG: enough for the api to make the WebP variants. */
const PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4uSgbAAQOAdfMZCtrAAAAAElFTkSuQmCC',
  'base64',
);

export interface TestAnimal {
  name: string;
  species: 'DOG' | 'CAT';
  sex: 'MALE' | 'FEMALE';
}

/** Creates the animals through the api (AFORM-01), each with one photo; returns their ids. */
export async function createAnimals(
  ngo: TestNgo,
  animals: readonly TestAnimal[],
): Promise<string[]> {
  const ip = newTestIp();
  const token = await sessionToken(ngo, ip);
  const ids: string[] = [];
  for (const animal of animals) {
    const form = new FormData();
    form.append('file', new Blob([PHOTO], { type: 'image/png' }), 'foto.png');
    const upload = await fetch(`${API_URL}/me/images`, {
      method: 'POST',
      body: form,
      headers: {
        'X-Internal-Token': internalToken(),
        'X-Client-IP': ip,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!upload.ok) throw new Error(`POST /me/images: ${upload.status}`);
    const { id } = (await upload.json()) as { id: string };
    const created = await api('/me/animals', {
      method: 'POST',
      ip,
      token,
      body: JSON.stringify({
        ...animal,
        size: 'MEDIUM',
        ageValue: 2,
        ageUnit: 'YEARS',
        imageIds: [id],
      }),
    });
    ids.push(((await created.json()) as { id: string }).id);
  }
  return ids;
}

/** Id and slug of the NGO (GET /me/ngo): the bucket prefix and the public page. */
export async function ngoIdentity(
  ngo: TestNgo,
): Promise<{ id: string; slug: string }> {
  const ip = newTestIp();
  const token = await sessionToken(ngo, ip);
  const response = await fetch(`${API_URL}/me/ngo`, {
    headers: {
      'X-Internal-Token': internalToken(),
      'X-Client-IP': ip,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error(`GET /me/ngo: ${response.status}`);
  return (await response.json()) as { id: string; slug: string };
}

/** Object keys under `prefix` in the Compose MinIO, read with the stack's own mc container. */
export function bucketKeys(prefix: string): string[] {
  if (!/^[\w/-]+$/.test(prefix)) throw new Error('Unexpected prefix');
  const env = parseEnv(readFileSync(`${ROOT}.env`, 'utf8'));
  const bucket = env['MINIO_BUCKET'] ?? 'animal-helper-dev';
  const output = execFileSync(
    'docker',
    [
      'compose',
      'run',
      '--rm',
      '--no-deps',
      '-T',
      'minio-init',
      'ls',
      '--recursive',
      '--json',
      `local/${bucket}/${prefix}`,
    ],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' },
  );
  return output
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line) as { key?: string; status?: string })
    .filter((entry) => entry.status === 'success' && entry.key)
    .map((entry) => `${prefix}${entry.key}`);
}

/** Deletes the NGO through the api (PROF-07), logging in from another IP. */
export async function deleteNgo(ngo: TestNgo): Promise<void> {
  const ip = newTestIp();
  const token = await sessionToken(ngo, ip);
  await api('/me/ngo', {
    method: 'DELETE',
    ip,
    token,
    body: JSON.stringify({ password: ngo.password }),
  });
}

interface MailSummary {
  ID: string;
}

async function mailsTo(email: string): Promise<MailSummary[]> {
  const response = await fetch(
    `${MAILPIT_URL}/search?query=${encodeURIComponent(`to:"${email}"`)}`,
  );
  const { messages } = (await response.json()) as { messages: MailSummary[] };
  return messages;
}

export async function mailCount(email: string): Promise<number> {
  return (await mailsTo(email)).length;
}

/** The path of the newest reset link sent to `email` (AUTH-09). */
export async function latestResetPath(email: string): Promise<string> {
  const [newest] = await mailsTo(email);
  if (!newest) throw new Error(`No e-mail to ${email}`);
  const response = await fetch(`${MAILPIT_URL}/message/${newest.ID}`);
  const { Text } = (await response.json()) as { Text: string };
  const path = /\/recuperar-senha\/[\w-]+/.exec(Text)?.[0];
  if (!path) throw new Error('No reset link in the e-mail');
  return path;
}

export async function deleteMailsTo(email: string): Promise<void> {
  const ids = (await mailsTo(email)).map((mail) => mail.ID);
  if (ids.length === 0) return;
  await fetch(`${MAILPIT_URL}/messages`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IDs: ids }),
  });
}

/**
 * "Clock moved forward" (AUTH-13): the api's clock can't be faked from here, so
 * the pending links of the NGO get an expiry in the past, in the Compose database.
 */
export function expirePendingResets(email: string): void {
  if (!/^[\w.@-]+$/.test(email)) throw new Error('Unexpected e-mail');
  const sql = `UPDATE password_resets SET expires_at = now() - interval '1 minute' WHERE used_at IS NULL AND ngo_id = (SELECT id FROM ngos WHERE email = '${email}')`;
  execFileSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'database',
      'sh',
      '-c',
      `psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "${sql}"`,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
}
