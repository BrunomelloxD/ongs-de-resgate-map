import { hash } from 'argon2';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { type SeedNgo, upsertNgo } from './ngo.seed.js';

// Fixed id and CNPJ: running the seeder again updates the same row (DEP-26).
// Near the middle of the example NGOs, so the map frames all of them (DEP-22).
export const DEMO_ACCOUNT_NGO: SeedNgo = {
  id: '5eed0002-0000-4000-8000-000000000001',
  cnpj: '51820472000121',
  name: 'ONG Demonstração',
  slug: 'ong-demonstracao',
  description:
    'Conta de demonstração do Animal Helper. Entre com as credenciais da tela de login e cadastre animais para conhecer o painel; tudo o que for criado aqui é apagado todos os dias.',
  logoId: '5eed0002-1000-4000-8000-000000000001',
  logoFile: '01-puppy-portrait-kim-8-weeks.jpg',
  whatsapp: '5511987650099',
  cep: '01310200',
  street: 'Avenida Paulista',
  number: '1578',
  district: 'Bela Vista',
  lat: -23.5614,
  lng: -46.6559,
  weekdays: { opensAt: '09:00', closesAt: '18:00' },
  saturday: { opensAt: '09:00', closesAt: '13:00' },
  sunday: null,
};

/**
 * The shared account of the locked demo (AD-008, DEP-25 to DEP-27). Not a seed
 * (`isSeed: false`): it logs in and its animals count in the quota; `expiresAt`
 * stays null, so the cleanup never removes it, only its animals.
 */
export async function seedDemoAccount(prisma: PrismaClient): Promise<number> {
  const email = process.env['DEMO_ACCOUNT_EMAIL'];
  const password = process.env['DEMO_ACCOUNT_PASSWORD'];
  if (!email || !password) {
    console.warn(
      'seed demo-account: DEMO_ACCOUNT_EMAIL e DEMO_ACCOUNT_PASSWORD não definidas; conta demo não criada',
    );
    return 0;
  }

  await upsertNgo(prisma, DEMO_ACCOUNT_NGO, {
    isSeed: false,
    email,
    passwordHash: await hash(password),
    // A new DEMO_ACCOUNT_PASSWORD takes effect on the next run.
    updatePassword: true,
  });
  return 1;
}
