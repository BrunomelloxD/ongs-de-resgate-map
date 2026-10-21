import { render, screen } from '@testing-library/react';
import type { ResetPasswordFormProps } from '../components/reset-password-form.client';
import { ResetPasswordContainer } from './reset-password.container';

const resetPassword = vi.hoisted(() =>
  vi.fn(async (token: string) => ({ fieldErrors: {}, formError: token })),
);
const form = vi.hoisted(() => ({
  action: undefined as unknown as ResetPasswordFormProps['action'],
}));

vi.mock('../actions/reset-password', () => ({ resetPassword }));
vi.mock('../components/reset-password-form.client', () => ({
  ResetPasswordForm: (props: ResetPasswordFormProps) => {
    form.action = props.action;
    return <p>reset-form</p>;
  },
}));

describe('ResetPasswordContainer', () => {
  it('AUTH-12: liga a action ao token do link', async () => {
    render(
      await ResetPasswordContainer({
        params: Promise.resolve({ token: 'token-do-link' }),
      }),
    );
    const data = new FormData();
    await form.action({ fieldErrors: {} }, data);

    expect(screen.getByText('reset-form')).toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith(
      'token-do-link',
      { fieldErrors: {} },
      data,
    );
  });
});
