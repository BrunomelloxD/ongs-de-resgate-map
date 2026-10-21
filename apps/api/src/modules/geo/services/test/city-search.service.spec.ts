import { CitySearchService } from '../city-search.service.js';

const SAO_PAULO = {
  id: 3550308,
  name: 'São Paulo',
  uf: 'SP',
  lat: -23.5329,
  lng: -46.6395,
};

const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

describe('CitySearchService (LOC-07, LOC-08)', () => {
  const service = new CitySearchService();

  it.each(['sao paulo', 'São Paulo', 'SÃO PAULO'])(
    '"%s" acha São Paulo/SP com lat/lng, sem acento e sem caixa',
    (q) => {
      expect(service.search(q)).toContainEqual(SAO_PAULO);
    },
  );

  it('acento no nome do município não impede o achado ("avila" → Dias d\'Ávila/BA)', () => {
    expect(service.search('avila').map((c) => `${c.name}/${c.uf}`)).toContain(
      "Dias d'Ávila/BA",
    );
  });

  it('"vila" devolve no máximo 5, todos contendo o texto', () => {
    const result = service.search('vila');

    expect(result).toHaveLength(5);
    for (const city of result) {
      expect(normalize(city.name)).toContain('vila');
    }
  });

  it('o nome exato vem antes, para não sumir entre os 5 ("cruz" → Cruz/CE)', () => {
    expect(service.search('cruz')[0]).toEqual({
      id: 2304251,
      name: 'Cruz',
      uf: 'CE',
      lat: -2.91813,
      lng: -40.176,
    });
  });

  it.each(['', 'sa', '  sa  ', 'Sã'])(
    'menos de 3 caracteres ("%s") devolve lista vazia',
    (q) => {
      expect(service.search(q)).toEqual([]);
    },
  );

  it('texto sem município devolve lista vazia', () => {
    expect(service.search('xyzw')).toEqual([]);
  });

  describe('findByName', () => {
    it('acha o município pelo nome exato e pela UF, sem acento e sem caixa', () => {
      expect(service.findByName('SAO PAULO', 'sp')).toEqual(SAO_PAULO);
    });

    it('nomes repetidos em várias UFs: devolve o da UF pedida', () => {
      expect(service.findByName('Bom Jesus', 'RS')).toEqual({
        id: 4302303,
        name: 'Bom Jesus',
        uf: 'RS',
        lat: -28.6697,
        lng: -50.4295,
      });
    });

    it('nome só parecido ou UF errada devolve null', () => {
      expect(service.findByName('Paulo', 'SP')).toBeNull();
      expect(service.findByName('São Paulo', 'RJ')).toBeNull();
    });
  });
});
