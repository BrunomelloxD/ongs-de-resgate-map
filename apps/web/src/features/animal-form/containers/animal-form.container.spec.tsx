import { render, screen } from '@testing-library/react';
import { deleteAnimal } from '../actions/delete-animal';
import { saveAnimal } from '../actions/save-animal';
import { uploadPhoto } from '../actions/upload-photo';
import { makeMyAnimal } from '../test-fixtures';
import { AnimalFormContainer } from './animal-form.container';

const received = vi.hoisted(() => ({ props: {} as Record<string, unknown> }));

vi.mock('../components/animal-form.client', () => ({
  AnimalForm: (props: Record<string, unknown>) => {
    received.props = props;
    return <p>formulário</p>;
  },
}));

const markUnavailable = vi.fn();

describe('AnimalFormContainer', () => {
  it('DASH-06/AFORM-01: cadastro com título, volta ao painel e as actions', () => {
    render(
      <AnimalFormContainer
        animal={null}
        maxPhotos={3}
        markUnavailable={markUnavailable}
        notice={<span>aviso</span>}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastrar animal' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar para seus animais' }),
    ).toHaveAttribute('href', '/painel');
    expect(received.props).toMatchObject({
      animal: null,
      maxPhotos: 3,
      // MAX_UPLOAD_MB is 5 in test/setup.ts (AFORM-08).
      maxUploadMb: 5,
      uploadPhoto,
      saveAnimal,
      deleteAnimal,
      markUnavailable,
    });
    render(<>{received.props['notice'] as React.ReactNode}</>);
    expect(screen.getByText('aviso')).toBeInTheDocument();
  });

  it('AFORM-13: edição com o nome do animal no título', () => {
    const animal = makeMyAnimal({ name: 'Mel' });

    render(
      <AnimalFormContainer
        animal={animal}
        maxPhotos={8}
        markUnavailable={markUnavailable}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Editar Mel' }),
    ).toBeInTheDocument();
    expect(received.props).toMatchObject({ animal, maxPhotos: 8 });
  });
});
