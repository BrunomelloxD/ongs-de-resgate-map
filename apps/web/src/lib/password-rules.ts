/** SIGN-15: shown while typing, in this order. Same rules as the api's SignupNgoDto. */
export const PASSWORD_RULES = [
  {
    id: 'length',
    label: '8 ou mais caracteres',
    test: (value: string) => value.length >= 8,
  },
  {
    id: 'letter',
    label: 'Ao menos uma letra',
    test: (value: string) => /\p{L}/u.test(value),
  },
  {
    id: 'number',
    label: 'Ao menos um número',
    test: (value: string) => /\d/.test(value),
  },
] as const;
