import { render, screen } from '@testing-library/react';
import SignupStepRoute, { generateStaticParams, metadata } from './page';

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('./signup-step-content', () => ({
  SignupStepContent: ({ slug }: { slug: string }) => <p>etapa {slug}</p>,
}));

const props = (etapa: string) =>
  ({ params: Promise.resolve({ etapa }) }) as PageProps<'/cadastro/[etapa]'>;

describe('/cadastro/[etapa]', () => {
  it.each([
    ['sobre', 1, 'Sobre a ONG', '/'],
    ['contato', 2, 'Contato e acesso', '/cadastro/sobre'],
    ['endereco', 3, 'Endereço', '/cadastro/contato'],
    ['horario', 4, 'Horário', '/cadastro/endereco'],
    ['revisao', 5, 'Revisão', '/cadastro/horario'],
  ])(
    'SIGN-01: %s mostra "Etapa %i de 5" com o nome "%s"',
    async (etapa, n, label, back) => {
      render(await SignupStepRoute(props(etapa)));

      expect(screen.getByText(`Etapa ${n} de 5`)).toBeVisible();
      expect(screen.getByText(label, { selector: 'span' })).toBeVisible();
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuetext',
        `Etapa ${n} de 5: ${label}`,
      );
      expect(screen.getByText('Cadastro da ONG')).toBeVisible();
      expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute(
        'href',
        back,
      );
      expect(screen.getByRole('main')).toHaveTextContent(`etapa ${etapa}`);
    },
  );

  it('etapa xyz → notFound()', async () => {
    await expect(SignupStepRoute(props('xyz'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalled();
  });

  it('pré-renderiza as 5 etapas e tem o título da página', () => {
    expect(generateStaticParams()).toEqual([
      { etapa: 'sobre' },
      { etapa: 'contato' },
      { etapa: 'endereco' },
      { etapa: 'horario' },
      { etapa: 'revisao' },
    ]);
    expect(metadata.title).toBe('Cadastro da ONG');
  });
});
