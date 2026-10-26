import { render, screen } from '@testing-library/react';
import { loadPinPicker, ProfileSections } from './profile-sections.client';

const recorded = vi.hoisted(() => ({
  profile: {} as Record<string, unknown>,
  password: {} as Record<string, unknown>,
  dialog: {} as Record<string, unknown>,
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicPinPicker() {
      return null;
    },
}));
vi.mock('@/features/location/client', () => ({
  lookupCep: vi.fn(),
  geocodeAddress: vi.fn(),
}));
vi.mock('@/features/ngo-account/client', () => ({
  ngoAccountDictionary: {
    page: {
      changePassword: 'Alterar senha',
      dangerTitle: 'Excluir a conta',
      dangerLead: 'Apaga tudo.',
    },
  },
  ProfileForm: (props: Record<string, unknown>) => {
    recorded.profile = props;
    return <div>perfil {props['contactExtra'] as React.ReactNode}</div>;
  },
  ChangePasswordForm: (props: Record<string, unknown>) => {
    recorded.password = props;
    return <p>troca de senha</p>;
  },
  DeleteAccountDialog: (props: Record<string, unknown>) => {
    recorded.dialog = props;
    return <p>exclusão</p>;
  },
}));

describe('ProfileSections', () => {
  it('liga o perfil, a troca de senha e a exclusão às actions e ao mapa', async () => {
    const { lookupCep, geocodeAddress } =
      await import('@/features/location/client');
    const actions = {
      updateProfile: vi.fn(),
      uploadImage: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    };

    render(
      <ProfileSections
        ngo={{ id: 'x' } as never}
        maxUploadMb={5}
        tileUrl="http://tiles.test/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        notice={<span>aviso</span>}
        {...actions}
      />,
    );

    expect(recorded.profile).toMatchObject({
      ngo: { id: 'x' },
      maxUploadMb: 5,
      tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      updateProfile: actions.updateProfile,
      uploadImage: actions.uploadImage,
      lookupCep,
      geocodeAddress,
    });
    expect(recorded.password['action']).toBe(actions.changePassword);
    expect(recorded.dialog['onDelete']).toBe(actions.deleteAccount);
    expect(screen.getByRole('link', { name: 'Alterar senha' })).toHaveAttribute(
      'href',
      '#alterar-senha',
    );
    expect(
      screen.getByRole('heading', { name: 'Excluir a conta' }),
    ).toBeVisible();
  });

  it('PERF-01: o PinPicker vem do módulo do Leaflet, carregado só no navegador', async () => {
    const { PinPicker } = await import('@/components/ui/pin-picker.client');

    await expect(loadPinPicker()).resolves.toBe(PinPicker);
  });
});
