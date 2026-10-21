// One-off generator for src/modules/geo/data/municipalities.json (IBGE municipalities with coordinates).
// Run from apps/api: npx tsx tools/geo/build-municipalities.ts
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { format } from 'prettier';
import { z } from 'zod';

const SOURCE =
  'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json';
const OUTPUT = join(
  import.meta.dirname,
  '../../src/modules/geo/data/municipalities.json',
);

// The download is untrusted data: validate every field before writing it.
const states = z.array(
  z.object({ codigo_uf: z.number().int(), uf: z.string().regex(/^[A-Z]{2}$/) }),
);
const municipalities = z.array(
  z.object({
    codigo_ibge: z.number().int(),
    nome: z.string().min(1).max(80),
    latitude: z.number().min(-34).max(6),
    longitude: z.number().min(-74).max(-28),
    codigo_uf: z.number().int(),
  }),
);

async function download(file: string): Promise<unknown> {
  const response = await fetch(`${SOURCE}/${file}`);
  if (!response.ok) {
    throw new Error(`${file}: HTTP ${response.status}`);
  }
  return response.json();
}

const ufByCode = new Map(
  states.parse(await download('estados.json')).map((s) => [s.codigo_uf, s.uf]),
);
const rows = municipalities
  .parse(await download('municipios.json'))
  .map((m) => {
    const uf = ufByCode.get(m.codigo_uf);
    if (!uf) {
      throw new Error(`Unknown codigo_uf ${m.codigo_uf} (${m.nome})`);
    }
    return {
      id: m.codigo_ibge,
      name: m.nome,
      uf,
      lat: m.latitude,
      lng: m.longitude,
    };
  })
  .sort((a, b) => a.id - b.id);

// Written already formatted, so `prettier --check` in the gate passes.
await writeFile(OUTPUT, await format(JSON.stringify(rows), { parser: 'json' }));
console.log(`${rows.length} municipalities written to ${OUTPUT}`);
