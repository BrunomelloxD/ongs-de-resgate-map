import { render, screen } from '@testing-library/react';
import ResetPasswordRoute, { metadata } from './page';

const received = vi.hoisted(() => ({ params: undefined as unknown }));

vi.mock('@/features/auth', () => ({
  authDictionary: { reset: { metaTitle: 'Nova senha' } },
  ResetPasswordContainer: ({ params }: { params: unknown }) => {
    received.params = params;
    return <p>reset-container</p>;
  },
}));

describe('/recuperar-senha/[token]', () => {
  it('compõe a nova senha da feature e repassa o token da URL', () => {
    const params = Promise.resolve({ token: 'token-do-link' });

    render(
      <ResetPasswordRoute params={params} searchParams={Promise.resolve({})} />,
    );

    expect(screen.getByRole('main')).toHaveTextContent('reset-container');
    expect(received.params).toBe(params);
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Nova senha');
  });
});
