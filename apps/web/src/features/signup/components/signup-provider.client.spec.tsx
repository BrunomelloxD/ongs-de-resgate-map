import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  EMPTY_SIGNUP,
  SIGNUP_STORAGE_KEY,
  SignupProvider,
  useSignup,
} from './signup-provider.client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function AboutStep() {
  const { data, update } = useSignup();
  return (
    <label>
      Razão social
      <input
        value={data.about.legalName}
        onChange={(e) => update('about', { legalName: e.target.value })}
      />
    </label>
  );
}

function ContactStep() {
  const { data, update } = useSignup();
  return (
    <>
      <label>
        E-mail
        <input
          value={data.contact.email}
          onChange={(e) => update('contact', { email: e.target.value })}
        />
      </label>
      <label>
        Senha
        <input
          value={data.contact.password}
          onChange={(e) => update('contact', { password: e.target.value })}
        />
      </label>
      <label>
        Confirmação
        <input
          value={data.contact.confirmation}
          onChange={(e) => update('contact', { confirmation: e.target.value })}
        />
      </label>
    </>
  );
}

function Status() {
  const { signupRequestId, ready, image, setImage } = useSignup();
  return (
    <>
      <output aria-label="id">{signupRequestId}</output>
      <output aria-label="pronto">{String(ready)}</output>
      <output aria-label="imagem">{image?.name ?? ''}</output>
      <button
        type="button"
        onClick={() => setImage(new File(['x'], 'logo.png'))}
      >
        Escolher imagem
      </button>
    </>
  );
}

/** Two steps of the wizard, one at a time, like the routes. */
function Wizard() {
  const [step, setStep] = useState<'about' | 'contact'>('about');
  return (
    <SignupProvider>
      <Status />
      {step === 'about' ? <AboutStep /> : <ContactStep />}
      <button type="button" onClick={() => setStep('contact')}>
        Continuar
      </button>
      <button type="button" onClick={() => setStep('about')}>
        Voltar
      </button>
    </SignupProvider>
  );
}

const saved = () => sessionStorage.getItem(SIGNUP_STORAGE_KEY) ?? '';
const id = () => screen.getByLabelText('id').textContent;

async function fillBothSteps() {
  await userEvent.type(
    screen.getByLabelText('Razão social'),
    'Patas do Bairro',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await userEvent.type(screen.getByLabelText('E-mail'), 'contato@patas.org');
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
  await userEvent.type(screen.getByLabelText('Confirmação'), 'confirma456');
}

beforeEach(() => sessionStorage.clear());

describe('SignupProvider', () => {
  it('SIGN-02: voltar uma etapa mantém os valores das duas etapas', async () => {
    render(<Wizard />);
    await fillBothSteps();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByLabelText('Razão social')).toHaveValue(
      'Patas do Bairro',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByLabelText('E-mail')).toHaveValue('contato@patas.org');
    expect(screen.getByLabelText('Senha')).toHaveValue('segredo123');
  });

  it('o sessionStorage espelha os dados, sem a senha nem a confirmação', async () => {
    render(<Wizard />);
    await fillBothSteps();

    const stored = JSON.parse(saved()) as {
      data: typeof EMPTY_SIGNUP;
    };
    expect(stored.data.about.legalName).toBe('Patas do Bairro');
    expect(stored.data.contact).toEqual({
      email: 'contato@patas.org',
      whatsapp: '',
    });
    expect(saved()).not.toContain('segredo123');
    expect(saved()).not.toContain('confirma456');
  });

  it('recarregar mantém tudo menos a senha e a confirmação', async () => {
    const first = render(<Wizard />);
    await fillBothSteps();
    first.unmount();

    render(<Wizard />);
    await waitFor(() =>
      expect(screen.getByLabelText('Razão social')).toHaveValue(
        'Patas do Bairro',
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByLabelText('E-mail')).toHaveValue('contato@patas.org');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.getByLabelText('Confirmação')).toHaveValue('');
  });

  it('SIGN-32: signupRequestId é um uuid igual em toda a sessão do assistente, inclusive depois de recarregar', async () => {
    const first = render(<Wizard />);
    await waitFor(() => expect(id()).toMatch(UUID));
    const original = id();

    await fillBothSteps();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(id()).toBe(original);
    first.unmount();

    render(<Wizard />);
    await waitFor(() => expect(id()).toMatch(UUID));
    expect(id()).toBe(original);
  });

  it('fica pronto só depois de ler o que estava salvo', async () => {
    render(<Wizard />);

    await waitFor(() =>
      expect(screen.getByLabelText('pronto')).toHaveTextContent('true'),
    );
  });

  it('a imagem fica só em memória: não vai para o sessionStorage nem volta ao recarregar', async () => {
    const first = render(<Wizard />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Escolher imagem' }),
    );

    expect(screen.getByLabelText('imagem')).toHaveTextContent('logo.png');
    expect(saved()).not.toContain('logo.png');
    first.unmount();

    render(<Wizard />);
    await waitFor(() => expect(id()).toMatch(UUID));
    expect(screen.getByLabelText('imagem')).toHaveTextContent('');
  });

  it.each([
    ['JSON quebrado', '{'],
    ['sem signupRequestId', JSON.stringify({ data: EMPTY_SIGNUP })],
    ['sem dados', JSON.stringify({ signupRequestId: 'x' })],
  ])(
    'com o salvo inválido (%s), começa vazio e com um id novo',
    async (_case, value) => {
      sessionStorage.setItem(SIGNUP_STORAGE_KEY, value);

      render(<Wizard />);

      await waitFor(() => expect(id()).toMatch(UUID));
      expect(screen.getByLabelText('Razão social')).toHaveValue('');
    },
  );

  it('reset() apaga o sessionStorage, os dados e a imagem, e começa outro signupRequestId', async () => {
    function Reset() {
      const { reset, conflict, setConflict } = useSignup();
      return (
        <>
          <output aria-label="conflito">{conflict?.error ?? ''}</output>
          <button
            type="button"
            onClick={() =>
              setConflict({
                field: 'email',
                error: 'Este e-mail já tem cadastro.',
              })
            }
          >
            Conflito
          </button>
          <button type="button" onClick={reset}>
            Limpar
          </button>
        </>
      );
    }
    render(
      <SignupProvider>
        <Status />
        <AboutStep />
        <Reset />
      </SignupProvider>,
    );
    await userEvent.type(screen.getByLabelText('Razão social'), 'Patas');
    await userEvent.click(
      screen.getByRole('button', { name: 'Escolher imagem' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Conflito' }));
    expect(screen.getByLabelText('conflito')).toHaveTextContent(
      'Este e-mail já tem cadastro.',
    );
    const before = id();

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    expect(screen.getByLabelText('Razão social')).toHaveValue('');
    expect(screen.getByLabelText('imagem')).toHaveTextContent('');
    expect(screen.getByLabelText('conflito')).toHaveTextContent('');
    expect(id()).toMatch(UUID);
    expect(id()).not.toBe(before);
    expect(saved()).not.toContain('Patas');
  });

  it('useSignup fora do provider avisa o erro de uso', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => render(<AboutStep />)).toThrow(
      'useSignup must be used inside SignupProvider.',
    );
    consoleError.mockRestore();
  });
});
