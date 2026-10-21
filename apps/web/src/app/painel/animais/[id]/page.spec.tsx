import { render, screen } from '@testing-library/react';
import EditAnimalRoute, { instant, metadata } from './page';

const getMyNgo = vi.hoisted(() => vi.fn());
const getDemoInfo = vi.hoisted(() => vi.fn());
const getMyAnimal = vi.hoisted(() => vi.fn());
const toggleAvailability = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/features/dashboard', () => ({ getMyNgo, toggleAvailability }));
vi.mock('@/features/demo', () => ({
  getDemoInfo,
  DemoExpiryNotice: ({ expiresAt }: { expiresAt: string | null }) => (
    <span>aviso {expiresAt}</span>
  ),
}));
vi.mock('@/features/animal-form', () => ({
  animalFormDictionary: { page: { metaEdit: 'Editar animal' } },
  getMyAnimal,
  photoLimit: (demo: { enabled: boolean }) => (demo.enabled ? 3 : 8),
  AnimalFormContainer: (props: {
    animal: { name: string };
    maxPhotos: number;
    markUnavailable: unknown;
    notice: React.ReactNode;
  }) => (
    <div>
      edição de {props.animal.name} com {props.maxPhotos} fotos{' '}
      {props.markUnavailable === toggleAvailability ? 'e toggle' : ''}{' '}
      {props.notice}
    </div>
  ),
}));

const ID = '1d6a7c2e-3b4f-4a5d-9e8f-7a6b5c4d3e2f';
const props = (id = ID) =>
  ({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({}),
  }) as PageProps<'/painel/animais/[id]'>;

beforeEach(() => {
  getMyNgo.mockResolvedValue({ expiresAt: null });
  getDemoInfo.mockResolvedValue({ enabled: false });
});

describe('/painel/animais/[id]', () => {
  it('AFORM-13: acha o animal da ONG pelo id e abre a edição', async () => {
    getMyAnimal.mockResolvedValue({ name: 'Caramelo' });

    render(await EditAnimalRoute(props()));

    expect(getMyAnimal).toHaveBeenCalledWith(ID);
    expect(screen.getByRole('main')).toHaveTextContent(
      'edição de Caramelo com 8 fotos e toggle aviso',
    );
  });

  it('SEC-06: animal de outra ONG, excluído ou id malformado → notFound()', async () => {
    getMyAnimal.mockResolvedValue(null);

    await expect(EditAnimalRoute(props('nao-e-uuid'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });

  it('é uma rota bloqueante, para o 404 ser um status HTTP real', () => {
    expect(instant).toBe(false);
    expect(metadata.title).toBe('Editar animal');
  });
});
