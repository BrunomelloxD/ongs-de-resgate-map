import { render, screen } from '@testing-library/react';
import { AccountDeletedNotice } from './account-deleted-notice';

describe('AccountDeletedNotice', () => {
  it('PROF-08: anuncia "Conta excluída."', () => {
    render(<AccountDeletedNotice />);

    expect(screen.getByRole('status')).toHaveTextContent('Conta excluída.');
  });
});
