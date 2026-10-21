import { formText } from './form-data';

describe('formText', () => {
  it('devolve o texto do campo', () => {
    const data = new FormData();
    data.set('email', 'contato@patas.org');

    expect(formText(data, 'email')).toBe('contato@patas.org');
  });

  it('campo ausente ou arquivo vira texto vazio', () => {
    const data = new FormData();
    data.set('foto', new File(['x'], 'foto.png'));

    expect(formText(data, 'email')).toBe('');
    expect(formText(data, 'foto')).toBe('');
  });
});
