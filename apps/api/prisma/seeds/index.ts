import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedAnimals } from './animal.seed.js';
import { seedDemoAccount } from './demo-account.seed.js';
import { seedNgos } from './ngo.seed.js';

// Register each seeder here: { name, run }. Animals depend on the NGOs.
// The demo account (AD-008) needs DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD.
const seeders: {
  name: string;
  run: (prisma: PrismaClient) => Promise<number>;
}[] = [
  { name: 'ngo', run: seedNgos },
  { name: 'animal', run: seedAnimals },
  { name: 'demo-account', run: seedDemoAccount },
];

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  for (const seeder of seeders) {
    const count = await seeder.run(prisma);
    console.log(`seed ${seeder.name}: ${count} registros`);
  }
} finally {
  await prisma.$disconnect();
}
