import { render, screen } from '@testing-library/react';
import { makeMyNgo } from '../test-fixtures';
import { FirstAccess } from './first-access';

const CLOSED_WEEK = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  closed: true,
  opensAt: null,
  closesAt: null,
}));

const item = (label: string) => screen.getByText(label).closest('li');

describe('FirstAccess', () => {
  it('DASH-07: CTA "Cadastrar o primeiro animal" leva a /painel/animais/novo', () => {
    render(<FirstAccess ngo={makeMyNgo()} animalCount={0} />);

    expect(
      screen.getByRole('link', { name: 'Cadastrar o primeiro animal' }),
    ).toHaveAttribute('href', '/painel/animais/novo');
    expect(
      screen.getByRole('heading', { name: 'Boas-vindas, Patas do Bairro!' }),
    ).toBeInTheDocument();
  });

  it('DASH-07: ONG sem imagem → item da imagem desmarcado; com horário → marcado', () => {
    render(<FirstAccess ngo={makeMyNgo({ imageUrl: null })} animalCount={0} />);

    expect(item('Imagem da ONG')).toHaveAttribute('data-done', 'false');
    expect(item('Imagem da ONG')).toHaveTextContent('Imagem da ONG: pendente');
    expect(item('Horário de funcionamento')).toHaveAttribute(
      'data-done',
      'true',
    );
    expect(item('Horário de funcionamento')).toHaveTextContent(
      'Horário de funcionamento: feito',
    );
    expect(item('Primeiro animal cadastrado')).toHaveAttribute(
      'data-done',
      'false',
    );
  });

  it('DASH-07: com imagem → marcado; todos os dias fechados → horário desmarcado', () => {
    render(
      <FirstAccess
        ngo={makeMyNgo({ weekHours: CLOSED_WEEK })}
        animalCount={0}
      />,
    );

    expect(item('Imagem da ONG')).toHaveAttribute('data-done', 'true');
    expect(item('Horário de funcionamento')).toHaveAttribute(
      'data-done',
      'false',
    );
  });

  it('DASH-07: com um animal → "Primeiro animal cadastrado" marcado', () => {
    render(<FirstAccess ngo={makeMyNgo()} animalCount={1} />);

    expect(item('Primeiro animal cadastrado')).toHaveAttribute(
      'data-done',
      'true',
    );
  });
});
