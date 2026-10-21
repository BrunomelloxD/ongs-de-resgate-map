import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('"Patas do Bairro" → patas-do-bairro', () => {
    expect(slugify('Patas do Bairro')).toBe('patas-do-bairro');
  });

  it('remove os acentos: "Associação São Francisco" → associacao-sao-francisco', () => {
    expect(slugify('Associação São Francisco')).toBe(
      'associacao-sao-francisco',
    );
  });

  it('usa "ong" quando sobra só símbolo', () => {
    expect(slugify('***')).toBe('ong');
    expect(slugify('')).toBe('ong');
  });

  it('colapsa espaços e hífens repetidos e tira os das pontas', () => {
    expect(slugify('  Amigos   dos -- Bichos  ')).toBe('amigos-dos-bichos');
    expect(slugify('--Lar--Temporário--')).toBe('lar-temporario');
  });

  it('troca símbolos e pontuação por hífen entre as palavras', () => {
    expect(slugify('Gatos & Cães (Zona Sul) 2.0')).toBe(
      'gatos-caes-zona-sul-2-0',
    );
  });
});
