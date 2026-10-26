import { Activity } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveRegion } from '@/components/ui/live-region.client';
import type {
  DeleteAnimal,
  SaveAnimal,
  SaveAnimalError,
  SetAvailability,
  UploadPhoto,
} from '../animal-form.types';
import { makeMyAnimal } from '../test-fixtures';
import { AnimalForm, type AnimalFormProps } from './animal-form.client';

const UPLOADED = '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';
const PHOTO_A = '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b';
const PHOTO_B = '3f4a5b6c-7d8e-4f9a-8b1c-2d3e4f5a6b7c';

function props(overrides: Partial<AnimalFormProps> = {}): AnimalFormProps {
  return {
    animal: null,
    maxPhotos: 3,
    maxUploadMb: 5,
    uploadPhoto: vi.fn<UploadPhoto>(async () => ({
      ok: true,
      id: UPLOADED,
      thumbUrl: '/t.webp',
    })),
    saveAnimal: vi.fn<SaveAnimal>(async () => ({ ok: false, fieldErrors: {} })),
    deleteAnimal: vi.fn<DeleteAnimal>(async () => ({ ok: false, error: 'x' })),
    markUnavailable: vi.fn<SetAvailability>(async () => ({ ok: true })),
    ...overrides,
  };
}

function setup(overrides: Partial<AnimalFormProps> = {}) {
  const user = userEvent.setup();
  const all = props(overrides);
  const view = render(
    <LiveRegion>
      <AnimalForm {...all} />
    </LiveRegion>,
  );
  return { user, ...all, view };
}

const fileInput = () =>
  document.querySelector<HTMLInputElement>('input[type="file"]')!;
const photo = () =>
  new File([new Uint8Array(10)], 'mel.jpg', { type: 'image/jpeg' });

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome'), 'Mel');
  await user.click(screen.getByRole('radio', { name: 'Gato' }));
  await user.click(screen.getByRole('radio', { name: 'Fêmea' }));
  await user.click(screen.getByRole('radio', { name: 'Pequeno' }));
  await user.type(screen.getByLabelText('Idade estimada'), '2');
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

/** Whether closing or reloading the tab now would ask first (DIRTY-02). */
function beforeUnloadPrevented() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('AnimalForm', () => {
  describe('DIRTY-01/02/03: alterações não salvas', () => {
    it('ao abrir (novo ou edição), sem alterações, não avisa', () => {
      const { view } = setup();
      expect(beforeUnloadPrevented()).toBe(false);
      view.unmount();

      setup({ animal: makeMyAnimal() });
      expect(beforeUnloadPrevented()).toBe(false);
    });

    it('editar um campo marca sujo; desfazer volta a limpo', async () => {
      const { user } = setup({ animal: makeMyAnimal() });

      await user.type(screen.getByLabelText('Nome'), 'x');
      expect(beforeUnloadPrevented()).toBe(true);
      await user.type(screen.getByLabelText('Nome'), '{Backspace}');

      expect(beforeUnloadPrevented()).toBe(false);
    });

    it('acrescentar uma foto marca sujo', async () => {
      const { user } = setup();

      await user.upload(fileInput(), photo());
      await screen.findByRole('group', { name: 'Foto 1 de 1' });

      expect(beforeUnloadPrevented()).toBe(true);
    });

    it('salvar limpa (o sucesso leva ao /painel); uma falha volta a sujo', async () => {
      let fail!: (result: SaveAnimalError) => void;
      const saveAnimal = vi.fn<SaveAnimal>(
        () => new Promise((resolve) => (fail = resolve)),
      );
      const { user } = setup({ saveAnimal });
      await user.upload(fileInput(), photo());
      await fillRequired(user);
      await waitFor(() => expect(screen.queryByText('Enviando…')).toBeNull());
      expect(beforeUnloadPrevented()).toBe(true);

      await user.click(screen.getByRole('button', { name: 'Salvar animal' }));
      expect(beforeUnloadPrevented()).toBe(false);

      await act(async () => fail({ ok: false, fieldErrors: {} }));
      expect(beforeUnloadPrevented()).toBe(true);
    });
  });

  it('A11Y-04/AFORM-06: todos os campos têm rótulo visível; raça vem com "SRD (vira-lata)"', () => {
    setup();

    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.getByRole('group', { name: 'Espécie' })).toBeInTheDocument();
    expect(screen.getByLabelText('Raça')).toHaveValue('SRD (vira-lata)');
    expect(screen.getByRole('group', { name: 'Sexo' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Porte' })).toBeInTheDocument();
    expect(screen.getByLabelText('Idade estimada')).toHaveValue('');
    expect(screen.getByLabelText('Unidade')).toHaveValue('YEARS');
    expect(screen.getByLabelText('Descrição')).toHaveAccessibleDescription(
      '0/1000 caracteres',
    );
    expect(
      screen.getByRole('button', { name: 'Salvar animal' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
  });

  it('AFORM-05/A11Y-05: salvar sem foto mostra "Adicione pelo menos 1 foto." no resumo e foca o campo', async () => {
    const { user, saveAnimal } = setup();
    await fillRequired(user);

    await user.click(screen.getByRole('button', { name: 'Salvar animal' }));

    const summary = screen.getByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary).getByRole('link', {
        name: 'Adicione pelo menos 1 foto.',
      }),
    ).toHaveAttribute('href', '#animal-photos');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Adicionar foto' }),
      ).toHaveFocus(),
    );
    expect(saveAnimal).not.toHaveBeenCalled();
  });

  it('A11Y-05: erros de vários campos ficam no resumo, em cada campo, com foco no primeiro', async () => {
    const { user } = setup();
    await user.upload(fileInput(), photo());
    await user.type(screen.getByLabelText('Nome'), 'a'.repeat(61));
    await user.type(screen.getByLabelText('Idade estimada'), '31');

    await user.click(screen.getByRole('button', { name: 'Salvar animal' }));

    const summary = screen.getByRole('region', {
      name: 'Corrija para continuar',
    });
    expect(
      within(summary)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([
      'Informe o nome, com até 60 caracteres.',
      'Escolha a espécie.',
      'Escolha o sexo.',
      'Escolha o porte.',
      'Informe a idade, um número de 0 a 30.',
    ]);
    const name = screen.getByLabelText('Nome');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(
      'Informe o nome, com até 60 caracteres.',
    );
    expect(
      screen.getByRole('radio', { name: 'Cão' }),
    ).toHaveAccessibleDescription('Escolha a espécie.');
    await waitFor(() => expect(name).toHaveFocus());

    // Fixing a field clears its error.
    await user.clear(name);
    await user.type(name, 'Mel');
    expect(name).not.toHaveAttribute('aria-invalid');
  });

  it('AFORM-09: os campos preenchidos sobrevivem a uma falha de foto', async () => {
    const uploadPhoto = vi.fn<UploadPhoto>(async () => ({
      ok: false,
      error: 'Não foi possível enviar a foto. Tente de novo.',
    }));
    const { user } = setup({ uploadPhoto });
    await fillRequired(user);

    await user.upload(fileInput(), photo());

    expect(
      await screen.findByRole('button', { name: 'Tentar de novo' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Mel');
    expect(screen.getByRole('radio', { name: 'Gato' })).toBeChecked();
    expect(screen.getByLabelText('Idade estimada')).toHaveValue('2');
  });

  it('AFORM-09: salvar com foto em erro pede para reenviar ou remover', async () => {
    const { user, saveAnimal } = setup({
      uploadPhoto: vi.fn<UploadPhoto>(async () => ({ ok: false, error: 'x' })),
    });
    await fillRequired(user);
    await user.upload(fileInput(), photo());
    await screen.findByRole('button', { name: 'Tentar de novo' });

    await user.click(screen.getByRole('button', { name: 'Salvar animal' }));

    expect(
      screen.getByRole('link', {
        name: 'Envie de novo ou remova as fotos com erro.',
      }),
    ).toBeInTheDocument();
    expect(saveAnimal).not.toHaveBeenCalled();
  });

  it('salvar com foto ainda enviando pede para esperar', async () => {
    let finish!: () => void;
    const uploadPhoto = vi.fn<UploadPhoto>(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ ok: true, id: UPLOADED, thumbUrl: '/t' });
        }),
    );
    const { user, saveAnimal } = setup({ uploadPhoto });
    await fillRequired(user);
    await user.upload(fileInput(), photo());

    await user.click(screen.getByRole('button', { name: 'Salvar animal' }));

    expect(
      screen.getByRole('link', {
        name: 'Espere as fotos terminarem de enviar.',
      }),
    ).toBeInTheDocument();
    expect(saveAnimal).not.toHaveBeenCalled();
    await act(async () => finish());
  });

  it('AFORM-01: dados válidos vão para `saveAnimal(null, …)` com as fotos enviadas', async () => {
    let fail!: (result: SaveAnimalError) => void;
    const saveAnimal = vi.fn<SaveAnimal>(
      () => new Promise((resolve) => (fail = resolve)),
    );
    const { user } = setup({ saveAnimal });
    await user.upload(fileInput(), photo());
    await fillRequired(user);
    await user.type(screen.getByLabelText('Descrição'), 'Dócil');
    await screen.findByRole('group', { name: 'Foto 1 de 1' });
    await waitFor(() => expect(screen.queryByText('Enviando…')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Salvar animal' }));

    expect(saveAnimal).toHaveBeenCalledWith(null, {
      name: 'Mel',
      species: 'CAT',
      sex: 'FEMALE',
      size: 'SMALL',
      ageValue: '2',
      ageUnit: 'YEARS',
      breed: 'SRD (vira-lata)',
      description: 'Dócil',
      imageIds: [UPLOADED],
    });
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    expect(screen.getByLabelText('Descrição')).toHaveAccessibleDescription(
      '5/1000 caracteres',
    );

    // DEMO-09: the api refuses; the message shows and takes the focus.
    const quota =
      'Sua ONG atingiu o limite de 10 animais da demo. Exclua um animal para cadastrar outro.';
    await act(async () => fail({ ok: false, error: quota, fieldErrors: {} }));

    const alert = screen.getByText(quota);
    expect(alert).toHaveAttribute('role', 'alert');
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.getByLabelText('Nome')).toHaveValue('Mel');
  });

  it('A11Y-05: erros por campo da api aparecem no campo e no resumo', async () => {
    const saveAnimal = vi.fn<SaveAnimal>(async () => ({
      ok: false,
      fieldErrors: { description: 'A descrição pode ter até 1000 caracteres.' },
    }));
    const { user } = setup({ animal: makeMyAnimal(), saveAnimal });

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      await screen.findByRole('link', {
        name: 'A descrição pode ter até 1000 caracteres.',
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Descrição')).toHaveFocus(),
    );
  });

  it('salvar que cai (rejeita) mostra o erro genérico', async () => {
    const { user } = setup({
      animal: makeMyAnimal(),
      saveAnimal: vi.fn<SaveAnimal>(async () => Promise.reject(new Error())),
    });

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(
      await screen.findByText(
        'Não foi possível salvar o animal. Tente de novo.',
      ),
    ).toBeInTheDocument();
  });

  it('AFORM-13: no modo edição os campos e as fotos vêm do animal, e salva no id dele', async () => {
    const animal = makeMyAnimal();
    const { user, saveAnimal } = setup({ animal });

    expect(screen.getByLabelText('Nome')).toHaveValue('Caramelo');
    expect(screen.getByRole('radio', { name: 'Cão' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Macho' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Médio' })).toBeChecked();
    expect(screen.getByLabelText('Idade estimada')).toHaveValue('3');
    expect(screen.getByLabelText('Descrição')).toHaveValue(
      'Calmo, adora passear de coleira.',
    );
    expect(
      screen.getAllByRole('group', { name: /^Foto \d de 2$/ }),
    ).toHaveLength(2);

    // AFORM-11: the second photo becomes the cover before saving.
    await user.click(
      within(screen.getByRole('group', { name: 'Foto 2 de 2' })).getByRole(
        'button',
        { name: 'Usar como capa' },
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(saveAnimal).toHaveBeenCalledWith(
      animal.id,
      expect.objectContaining({
        name: 'Caramelo',
        imageIds: [PHOTO_B, PHOTO_A],
      }),
    );
  });

  it('AFORM-06: animal sem raça nem descrição abre com os campos vazios', () => {
    setup({ animal: makeMyAnimal({ breed: null, description: null }) });

    expect(screen.getByLabelText('Raça')).toHaveValue('');
    expect(screen.getByLabelText('Descrição')).toHaveValue('');
  });

  it('AFORM-15: o modo edição tem "Excluir", que abre o diálogo do animal', async () => {
    const { user } = setup({ animal: makeMyAnimal() });

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByRole('dialog', { name: 'Excluir Caramelo?' }),
    ).toBeInTheDocument();
  });

  it('DEMO-06: mostra o aviso de expiração que a página manda', () => {
    setup({
      notice: <p>Seus dados serão apagados em 27/10/2026 — faltam 7 dias</p>,
    });

    expect(
      screen.getByText(
        'Seus dados serão apagados em 27/10/2026 — faltam 7 dias',
      ),
    ).toBeInTheDocument();
  });

  it('a unidade da idade pode virar meses', async () => {
    const { user } = setup();

    await user.selectOptions(screen.getByLabelText('Unidade'), 'meses');

    expect(screen.getByLabelText('Unidade')).toHaveValue('MONTHS');
  });
});

describe('AnimalForm dentro do <Activity>', () => {
  function renderIn(mode: 'visible' | 'hidden', all: AnimalFormProps) {
    return (
      <LiveRegion>
        <Activity mode={mode}>
          <AnimalForm {...all} />
        </Activity>
      </LiveRegion>
    );
  }

  it('depois de enviar, o formulário volta vazio quando a página reaparece', async () => {
    const user = userEvent.setup();
    let fail!: (result: SaveAnimalError) => void;
    const all = props({
      animal: null,
      saveAnimal: vi.fn<SaveAnimal>(() => new Promise((r) => (fail = r))),
    });
    const { rerender } = render(renderIn('visible', all));
    await user.upload(fileInput(), photo());
    await fillRequired(user);
    await waitFor(() => expect(screen.queryByText('Enviando…')).toBeNull());
    await user.click(screen.getByRole('button', { name: 'Salvar animal' }));

    // The redirect to /painel hides the page; coming back shows it again.
    rerender(renderIn('hidden', all));
    rerender(renderIn('visible', all));

    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.queryByRole('group', { name: /^Foto/ })).toBeNull();
    await act(async () => fail({ ok: false, fieldErrors: {} }));
  });

  it('sem envio, o rascunho continua quando a página reaparece', async () => {
    const user = userEvent.setup();
    const all = props();
    const { rerender } = render(renderIn('visible', all));
    await user.type(screen.getByLabelText('Nome'), 'Mel');

    rerender(renderIn('hidden', all));
    rerender(renderIn('visible', all));

    expect(screen.getByLabelText('Nome')).toHaveValue('Mel');
  });
});
