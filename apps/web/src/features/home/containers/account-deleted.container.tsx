import { AccountDeletedNotice } from '../components/account-deleted-notice';

type SearchParams = Record<string, string | string[] | undefined>;

export interface AccountDeletedContainerProps {
  searchParams: Promise<SearchParams>;
}

/** PROF-08: `?conta=excluida` shows the notice. */
export async function AccountDeletedContainer({
  searchParams,
}: AccountDeletedContainerProps) {
  const { conta } = await searchParams;
  const value = Array.isArray(conta) ? conta[0] : conta;

  return value === 'excluida' ? <AccountDeletedNotice /> : null;
}
