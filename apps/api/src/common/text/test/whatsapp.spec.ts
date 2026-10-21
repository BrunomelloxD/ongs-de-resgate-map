import {
  buildAdoptionMessage,
  buildNgoMessage,
  whatsappUrl,
} from '../whatsapp.js';

describe('buildAdoptionMessage', () => {
  it('macho usa "o"', () => {
    expect(buildAdoptionMessage('Caramelo', 'MALE')).toBe(
      'Olá! Vi o Caramelo no Animal Helper e quero saber como adotar.',
    );
  });

  it('fêmea usa "a"', () => {
    expect(buildAdoptionMessage('Mel', 'FEMALE')).toBe(
      'Olá! Vi a Mel no Animal Helper e quero saber como adotar.',
    );
  });
});

describe('buildNgoMessage', () => {
  it('cita a ONG pelo nome', () => {
    expect(buildNgoMessage('Patas do Bairro')).toBe(
      'Olá! Vi a Patas do Bairro no Animal Helper.',
    );
  });
});

describe('whatsappUrl', () => {
  it('monta a URL exata do wa.me com a mensagem de adoção codificada', () => {
    expect(
      whatsappUrl(
        '5511987654321',
        'Olá! Vi o Caramelo no Animal Helper e quero saber como adotar.',
      ),
    ).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1!%20Vi%20o%20Caramelo%20no%20Animal%20Helper%20e%20quero%20saber%20como%20adotar.',
    );
  });

  it('monta a URL exata do wa.me com a mensagem da ONG codificada', () => {
    expect(
      whatsappUrl(
        '5511987654321',
        'Olá! Vi a Patas do Bairro no Animal Helper.',
      ),
    ).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1!%20Vi%20a%20Patas%20do%20Bairro%20no%20Animal%20Helper.',
    );
  });

  it('codifica os caracteres reservados da query (encodeURIComponent)', () => {
    expect(
      whatsappUrl(
        '5511987654321',
        'Olá! Vi a Gatos & Cães #1 no Animal Helper.',
      ),
    ).toBe(
      'https://wa.me/5511987654321?text=Ol%C3%A1!%20Vi%20a%20Gatos%20%26%20C%C3%A3es%20%231%20no%20Animal%20Helper.',
    );
  });
});
