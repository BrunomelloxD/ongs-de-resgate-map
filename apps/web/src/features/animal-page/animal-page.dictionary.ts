// Texts from the animal screens of the design (.specs/front/previews/05-detalhe-do-animal-*).
// The spec fixes the counter, the adoption button, the unavailable texts and
// the 404 link (ANI-01, ANI-03, ANI-05, ANI-06).
export const animalPageDictionary = {
  gallery: {
    // SPEC_DEVIATION: the spec doesn't name the gallery nor the thumbnails.
    label: (name: string) => `Fotos de ${name}`,
    counter: (current: number, total: number) => `${current}/${total}`,
    thumb: (current: number, total: number) =>
      `Ver foto ${current} de ${total}`,
  },
  detail: {
    // ANI-03: "o" for males, "a" for females.
    adopt: (name: string, sex: 'MALE' | 'FEMALE') =>
      `Quero adotar ${sex === 'MALE' ? 'o' : 'a'} ${name}`,
    unavailable: (name: string) =>
      `${name} não está disponível para adoção no momento.`,
    otherAnimals: (ngo: string) => `Ver outros animais da ${ngo}`,
    // SPEC_DEVIATION: ANI-01 lists the fields without labels; the design's ones.
    fields: {
      species: 'Espécie',
      breed: 'Raça',
      sex: 'Sexo',
      size: 'Porte',
      age: 'Idade',
    },
    species: { DOG: 'Cão', CAT: 'Gato', OTHER: 'Outro' },
    sex: { MALE: 'Macho', FEMALE: 'Fêmea' },
    size: { SMALL: 'Pequeno', MEDIUM: 'Médio', LARGE: 'Grande' },
    about: (name: string) => `Sobre ${name}`,
    ngoTitle: 'Quem cuida',
    // SPEC_DEVIATION: ANI-01 asks for the NGO card without a link text.
    ngoLink: 'Ver página da ONG',
  },
  // SPEC_DEVIATION: SHARE-04 asks for og:description; used when the animal has no description.
  metaDescription: (name: string, ngo: string) =>
    `Conheça ${name}, da ${ngo}, no Animal Helper.`,
  notFound: {
    // ANI-06 fixes only the 404 and the link to the map; title from the api message.
    title: 'Animal não encontrado',
    description:
      'O animal pode ter sido adotado ou removido, ou o link está errado.',
    map: 'Ver o mapa de ONGs',
  },
  error: {
    title: 'Não conseguimos carregar o animal.',
    retry: 'Tentar novamente',
  },
} as const;
