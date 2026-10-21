import { render, screen } from '@testing-library/react';
import NewAnimalRoute, { instant, metadata } from './page';

const getMyNgo = vi.hoisted(() => vi.fn());
const getDemoInfo = vi.hoisted(() => vi.fn());
const toggleAvailability = vi.hoisted(() => vi.fn());

vi.mock('@/features/dashboard', () => ({ getMyNgo, toggleAvailability }));
vi.mock('@/features/demo', () => ({
  getDemoInfo,
  DemoExpiryNotice: ({ expiresAt }: { expiresAt: string | null }) => (
    <span>aviso {expiresAt}</span>
  ),
}));
vi.mock('@/features/animal-form', () => ({
  animalFormDictionary: { page: { newTitle: 'Cadastrar animal' } },
  photoLimit: (demo: { enabled: boolean }) => (demo.enabled ? 3 : 8),
  AnimalFormContainer: (props: {
    animal: unknown;
    maxPhotos: number;
    markUnavailable: unknown;
    notice: React.ReactNode;
  }) => (
    <div>
      formulário {props.animal === null ? 'novo' : 'edição'} com{' '}
      {props.maxPhotos} fotos{' '}
      {props.markUnavailable === toggleAvailability ? 'e toggle' : ''}{' '}
      {props.notice}
    </div>
  ),
}));

describe('/painel/animais/novo', () => {
  it('DASH-06/AFORM-07/DEMO-06: formulário vazio, limite da demo e aviso de expiração', async () => {
    getMyNgo.mockResolvedValue({ expiresAt: '2026-10-27T12:00:00.000Z' });
    getDemoInfo.mockResolvedValue({ enabled: true });

    render(await NewAnimalRoute());

    expect(screen.getByRole('main')).toHaveTextContent(
      'formulário novo com 3 fotos e toggle aviso 2026-10-27T12:00:00.000Z',
    );
  });

  it('AUTH-07: o redirect do 401 acontece antes de renderizar', async () => {
    getMyNgo.mockRejectedValue(new Error('NEXT_REDIRECT'));
    getDemoInfo.mockResolvedValue({ enabled: true });

    await expect(NewAnimalRoute()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('é uma rota bloqueante, com o título "Cadastrar animal"', () => {
    expect(instant).toBe(false);
    expect(metadata.title).toBe('Cadastrar animal');
  });
});
