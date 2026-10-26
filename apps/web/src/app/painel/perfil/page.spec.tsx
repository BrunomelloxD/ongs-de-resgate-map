import { render, screen } from '@testing-library/react';
import ProfileRoute, { instant, metadata } from './page';

const getMyNgo = vi.hoisted(() => vi.fn());
const recorded = vi.hoisted(() => ({ props: {} as Record<string, unknown> }));
const actions = vi.hoisted(() => ({
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
  updateProfile: vi.fn(),
  uploadNgoImage: vi.fn(),
}));

vi.mock('@/features/dashboard', () => ({ getMyNgo }));
vi.mock('@/features/demo', () => ({
  DemoExpiryNotice: ({ expiresAt }: { expiresAt: string | null }) => (
    <span>aviso {expiresAt}</span>
  ),
}));
vi.mock('@/features/ngo-account', () => ({
  ...actions,
  ngoAccountDictionary: {
    page: { metaTitle: 'Perfil da ONG', back: 'Voltar para o painel' },
  },
}));
vi.mock('./profile-sections.client', () => ({
  ProfileSections: (props: Record<string, unknown>) => {
    recorded.props = props;
    return <div>seções {props['notice'] as React.ReactNode}</div>;
  },
}));

describe('/painel/perfil', () => {
  it('PROF-01/DEMO-06: a ONG da sessão, o ambiente e o aviso de expiração', async () => {
    const ngo = { expiresAt: '2026-10-27T12:00:00.000Z' };
    getMyNgo.mockResolvedValue(ngo);

    render(await ProfileRoute());

    expect(screen.getByRole('main')).toHaveTextContent(
      'seções aviso 2026-10-27T12:00:00.000Z',
    );
    // MAX_UPLOAD_MB, TILE_URL and TILE_ATTRIBUTION come from test/setup.ts.
    expect(recorded.props).toMatchObject({
      ngo,
      maxUploadMb: 5,
      tileUrl: 'http://tiles.test/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      updateProfile: actions.updateProfile,
      uploadImage: actions.uploadNgoImage,
      changePassword: actions.changePassword,
      deleteAccount: actions.deleteAccount,
    });
    expect(
      screen.getByRole('link', { name: 'Voltar para o painel' }),
    ).toHaveAttribute('href', '/painel');
  });

  it('AUTH-07: o redirect do 401 acontece antes de renderizar', async () => {
    getMyNgo.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(ProfileRoute()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('é uma rota bloqueante, com o título "Perfil da ONG"', () => {
    expect(instant).toBe(false);
    expect(metadata.title).toBe('Perfil da ONG');
  });
});
