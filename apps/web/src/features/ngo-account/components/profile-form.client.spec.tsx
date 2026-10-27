import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PinPickerProps } from '@/components/ui/pin-picker.client';
import type {
  ProfileValues,
  UpdateProfileResult,
  UploadNgoImageResult,
} from '../ngo-account.types';
import { LOCAL_IMAGE_URL, makeMyNgo } from '../test-fixtures';
import { ProfileForm, type ProfileFormProps } from './profile-form.client';

const SAVED: UpdateProfileResult = { ok: true, message: 'Perfil atualizado.' };
const PIN_AGAIN = 'Confirme a localização no mapa antes de salvar.';

function FakePinPicker(props: PinPickerProps) {
  return (
    <div data-testid="pin-picker" data-readonly={String(props.readOnly)}>
      <button
        type="button"
        onClick={() => props.onConfirmedChange(props.position)}
      >
        Confirmar localização
      </button>
    </div>
  );
}

function renderForm(overrides: Partial<ProfileFormProps> = {}) {
  const props: ProfileFormProps = {
    ngo: makeMyNgo(),
    updateProfile: vi.fn(async (_values: ProfileValues) => SAVED),
    uploadImage: vi.fn(
      async (_data: FormData): Promise<UploadNgoImageResult> => ({
        ok: true,
        imageUrl: LOCAL_IMAGE_URL,
      }),
    ),
    maxUploadMb: 5,
    lookupCep: vi.fn(async () => ({ ok: false as const, error: 'x' })),
    geocodeAddress: vi.fn(async () => ({
      found: true,
      lat: -22.9,
      lng: -47.06,
    })),
    PinPicker: FakePinPicker,
    tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    ...overrides,
  };
  render(<ProfileForm {...props} />);
  return props;
}

const field = (label: string) => screen.getByLabelText(label);
const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
const summary = () =>
  screen.getByRole('region', { name: 'Corrija para continuar' });

/** Whether closing or reloading the tab now would ask first (DIRTY-02). */
function beforeUnloadPrevented() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('ProfileForm', () => {
  describe('DIRTY-01/02/03: alterações não salvas', () => {
    it('ao abrir, sem alterações, não avisa', () => {
      renderForm();

      expect(beforeUnloadPrevented()).toBe(false);
    });

    it('editar um campo marca sujo; salvar com sucesso limpa', async () => {
      renderForm();

      await userEvent.type(field('Razão social'), ' SP');
      expect(beforeUnloadPrevented()).toBe(true);

      await save();
      await screen.findByText('Perfil atualizado.');
      expect(beforeUnloadPrevented()).toBe(false);

      // Edits after the save count again.
      await userEvent.type(field('Razão social'), '!');
      expect(beforeUnloadPrevented()).toBe(true);
    });

    it('desfazer a edição volta a limpo', async () => {
      renderForm();

      await userEvent.type(field('Razão social'), '!');
      expect(beforeUnloadPrevented()).toBe(true);
      await userEvent.type(field('Razão social'), '{Backspace}');

      expect(beforeUnloadPrevented()).toBe(false);
    });

    it('salvar com erro continua sujo', async () => {
      renderForm({
        updateProfile: vi.fn(async () => ({
          ok: false as const,
          error: 'Não foi possível salvar.',
          errors: { fields: {}, hours: {} },
        })),
      });

      await userEvent.type(field('Razão social'), ' SP');
      await save();
      await screen.findByText('Não foi possível salvar.');

      expect(beforeUnloadPrevented()).toBe(true);
    });

    it('a imagem é salva na hora e não deixa o formulário sujo', async () => {
      renderForm();

      await userEvent.upload(
        document.querySelector<HTMLInputElement>('#profile-image')!,
        new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' }),
      );
      await screen.findByText('Imagem atualizada.');

      expect(beforeUnloadPrevented()).toBe(false);
    });
  });

  it('PROF-01: mostra os dados do cadastro editáveis e o CNPJ só leitura', () => {
    renderForm();

    expect(field('CNPJ')).toHaveValue('11.222.333/0001-81');
    expect(field('CNPJ')).toHaveAttribute('readonly');
    expect(field('Razão social')).toHaveValue('Patas do Bairro');
    expect(field('Razão social')).not.toHaveAttribute('readonly');
    expect(field('Descrição')).toHaveValue(
      'Resgatamos cães e gatos na Vila Mariana desde 2015.',
    );
    expect(field('E-mail')).toHaveValue('contato@patas.org');
    expect(field('WhatsApp')).toHaveValue('(11) 98765-4321');
    expect(field('CEP')).toHaveValue('04101-300');
    expect(field('Logradouro')).toHaveValue('Rua Vergueiro');
    expect(field('Número')).toHaveValue('3000');
    expect(field('Cidade')).toHaveValue('São Paulo');
    expect(field('UF')).toHaveValue('SP');
    expect(
      screen.getByRole('switch', { name: 'Segunda: aberta' }),
    ).toBeChecked();
    expect(
      screen.getByRole('switch', { name: 'Domingo: aberta' }),
    ).not.toBeChecked();
    expect(screen.getByTestId('pin-picker')).toBeInTheDocument();
  });

  it('DEP-60: no perfil, o mapa da localização cadastrada é somente leitura', () => {
    renderForm();

    expect(screen.getByTestId('pin-picker')).toHaveAttribute(
      'data-readonly',
      'true',
    );
  });

  it('PROF-04: salvar um perfil válido envia os dados e anuncia "Perfil atualizado."', async () => {
    const { updateProfile } = renderForm();

    await userEvent.clear(field('Razão social'));
    await userEvent.type(field('Razão social'), 'Patas do Bairro SP');
    await save();

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        legalName: 'Patas do Bairro SP',
        cep: '04101-300',
        location: {
          lat: -23.5869,
          lng: -46.6347,
          confirmedAt: '2026-10-20T12:00:00.000Z',
        },
      }),
    );
    const status = await screen.findByText('Perfil atualizado.');
    expect(status.closest('[role="status"]')).not.toBeNull();
  });

  it('PROF-03: mudar a cidade bloqueia "Salvar" até reconfirmar o pino', async () => {
    const { updateProfile, geocodeAddress } = renderForm();

    await userEvent.clear(field('Cidade'));
    await userEvent.type(field('Cidade'), 'Campinas');
    expect(screen.queryByTestId('pin-picker')).not.toBeInTheDocument();
    await save();

    expect(updateProfile).not.toHaveBeenCalled();
    expect(
      within(summary()).getByRole('link', { name: PIN_AGAIN }),
    ).toHaveAttribute('href', '#profile-address-location');

    // The blur geocodes the new address, and the pin can be confirmed again.
    await userEvent.tab();
    expect(geocodeAddress).toHaveBeenCalled();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Confirmar localização' }),
    );
    await save();

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Campinas',
        location: expect.objectContaining({ lat: -22.9, lng: -47.06 }),
      }),
    );
    expect(await screen.findByText('Perfil atualizado.')).toBeVisible();
  });

  it('A11Y-05: erros de validação aparecem no resumo e no campo, com foco no primeiro', async () => {
    const { updateProfile } = renderForm();

    await userEvent.clear(field('E-mail'));
    await userEvent.type(field('E-mail'), 'sem-arroba');
    await save();

    expect(updateProfile).not.toHaveBeenCalled();
    const message = 'Informe um e-mail válido, como nome@ong.org.';
    expect(
      within(summary()).getByRole('link', { name: message }),
    ).toHaveAttribute('href', '#profile-email');
    expect(field('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(field('E-mail')).toHaveAccessibleDescription(message);
    await waitFor(() => expect(field('E-mail')).toHaveFocus());

    await userEvent.type(field('E-mail'), '@ong.org');
    expect(field('E-mail')).not.toHaveAttribute('aria-invalid');
  });

  it('SIGN-07/SIGN-08: a descrição conta os caracteres e recusa menos de 30', async () => {
    renderForm();

    await userEvent.clear(field('Descrição'));
    await userEvent.type(field('Descrição'), 'Curta demais');
    expect(screen.getByText('12/600 caracteres')).toBeVisible();
    await save();

    expect(field('Descrição')).toHaveAccessibleDescription(
      'A descrição precisa ter de 30 a 600 caracteres. 12/600 caracteres',
    );
  });

  it('SIGN-25: o erro de um dia aparece no resumo com o nome do dia', async () => {
    renderForm();

    await userEvent.clear(
      screen.getByLabelText('Fechamento', {
        selector: '#profile-hours-2-closes',
      }),
    );
    await userEvent.type(
      screen.getByLabelText('Fechamento', {
        selector: '#profile-hours-2-closes',
      }),
      '08:00',
    );
    await save();

    expect(
      within(summary()).getByRole('link', {
        name: 'Terça: O horário de fechamento deve ser depois da abertura.',
      }),
    ).toHaveAttribute('href', '#profile-hours-2-opens');
  });

  it('409 da api → erro no e-mail', async () => {
    renderForm({
      updateProfile: vi.fn(async () => ({
        ok: false as const,
        errors: {
          fields: { email: 'Este e-mail já tem cadastro.' },
          hours: {},
        },
        error: 'Confira os campos marcados.',
      })),
    });

    await save();

    expect(
      within(summary()).getByRole('link', {
        name: 'Este e-mail já tem cadastro.',
      }),
    ).toBeVisible();
    expect(field('E-mail')).toHaveAccessibleDescription(
      'Este e-mail já tem cadastro.',
    );
  });

  it.each([
    [
      'erro geral da action',
      async () => ({
        ok: false as const,
        errors: { fields: {}, hours: {} },
        error: 'Não foi possível salvar o perfil agora. Tente de novo.',
      }),
    ],
    [
      'falha de rede',
      async (): Promise<UpdateProfileResult> => {
        throw new Error('offline');
      },
    ],
  ])(
    '%s → mensagem de erro, sem "Perfil atualizado."',
    async (_name, action) => {
      renderForm({ updateProfile: vi.fn(action) });

      await save();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível salvar o perfil agora. Tente de novo.',
      );
      expect(screen.queryByText('Perfil atualizado.')).not.toBeInTheDocument();
    },
  );

  it('enquanto salva, o botão fica desabilitado com "Salvando…"', async () => {
    let finish!: (result: UpdateProfileResult) => void;
    renderForm({
      updateProfile: vi.fn(
        () => new Promise<UpdateProfileResult>((resolve) => (finish = resolve)),
      ),
    });

    await save();

    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    finish(SAVED);
    expect(await screen.findByText('Perfil atualizado.')).toBeVisible();
  });

  it('SIGN-09: trocar a imagem envia o arquivo e mostra a nova imagem', async () => {
    const { uploadImage } = renderForm({
      ngo: makeMyNgo({ imageUrl: '/img/ngos/x/logo/y-600.webp' }),
    });
    expect(
      screen.getByRole('img', { name: 'Imagem atual da ONG' }),
    ).toHaveAttribute('src', '/img/ngos/x/logo/y-600.webp');

    const file = new File(['png'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(field('Trocar imagem'), file);

    expect(
      (uploadImage as ReturnType<typeof vi.fn>).mock.calls[0]![0].get('file'),
    ).toBe(file);
    expect(await screen.findByText('Imagem atualizada.')).toBeVisible();
    expect(
      screen.getByRole('img', { name: 'Imagem atual da ONG' }),
    ).toHaveAttribute('src', LOCAL_IMAGE_URL);
  });

  it('SIGN-10: um arquivo fora das regras nem é enviado', async () => {
    const { uploadImage } = renderForm();

    const file = new File(['gif'], 'logo.gif', { type: 'image/gif' });
    await userEvent.upload(field('Enviar uma imagem'), file, {
      applyAccept: false,
    });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(field('Enviar uma imagem')).toHaveAccessibleDescription(
      'JPG, PNG ou WebP, até 5 MB. Envie JPG, PNG ou WebP de até 5 MB.',
    );
  });

  it.each([
    [
      'recusa da api',
      async (): Promise<UploadNgoImageResult> => ({
        ok: false,
        error:
          'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
      }),
      'A demo atingiu o limite de armazenamento. Tente de novo depois da próxima limpeza.',
    ],
    [
      'falha de rede',
      async (): Promise<UploadNgoImageResult> => {
        throw new Error('offline');
      },
      'Não foi possível enviar a imagem agora. Tente de novo.',
    ],
  ])(
    'o envio da imagem com %s mostra o erro',
    async (_name, upload, message) => {
      renderForm({ uploadImage: vi.fn(upload) });

      await userEvent.upload(
        field('Enviar uma imagem'),
        new File(['png'], 'logo.png', { type: 'image/png' }),
      );

      expect(await screen.findByText(message)).toBeVisible();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    },
  );

  it('cancelar a escolha do arquivo não envia nada', () => {
    const { uploadImage } = renderForm();

    fireEvent.change(field('Enviar uma imagem'), { target: { files: [] } });

    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('SIGN-13: o WhatsApp ganha a máscara enquanto a ONG digita', async () => {
    renderForm();

    await userEvent.clear(field('WhatsApp'));
    await userEvent.type(field('WhatsApp'), '21987654321');

    expect(field('WhatsApp')).toHaveValue('(21) 98765-4321');
  });

  it('DEMO-06: mostra o aviso de expiração e o conteúdo extra do contato', () => {
    renderForm({
      notice: <p>Seus dados serão apagados em 27/10/2026 — faltam 6 dias</p>,
      contactExtra: <button type="button">Alterar senha</button>,
    });

    expect(
      screen.getByText(
        'Seus dados serão apagados em 27/10/2026 — faltam 6 dias',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Alterar senha' })).toBeVisible();
  });
});
