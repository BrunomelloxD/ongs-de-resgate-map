'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Info, Map as MapIcon, Menu, PawPrint, Store, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';
import { Logo } from './logo';
import { PinPhoto } from './pin-photo';
import { NAVBAR_PATHS, NAVBAR_TEXT as t } from './ui.dictionary';

/** What `GET /session/status` answers: only the name and the avatar, never the token. */
export type SessionStatus =
  { loggedIn: false } | { loggedIn: true; name: string; avatarUrl?: string };

const VISITOR: SessionStatus = { loggedIn: false };

/** Asked after hydration, so the public pages stay static and cookie-free (SEC-03). */
export async function fetchSessionStatus(): Promise<SessionStatus> {
  try {
    const response = await fetch(NAVBAR_PATHS.status, { cache: 'no-store' });
    return response.ok ? ((await response.json()) as SessionStatus) : VISITOR;
  } catch {
    return VISITOR;
  }
}

export interface NavbarProps {
  /** The page's section: "Mapa de ONGs" gets `aria-current="page"` (/localizacao, /mapa). */
  current?: 'map';
  /** Always in the "Rolada" state: the map page doesn't scroll. */
  solid?: boolean;
  /** Server Action `logout` (AUTH-05), for "Sair" in the phone menu. */
  logoutAction: () => Promise<void>;
  /** Stories and tests hand in their own session. */
  fetchStatus?: () => Promise<SessionStatus>;
  className?: string;
}

const LINKS = [
  { key: 'map', label: t.map, href: NAVBAR_PATHS.map, icon: MapIcon },
  {
    key: 'howItWorks',
    label: t.howItWorks,
    href: NAVBAR_PATHS.howItWorks,
    icon: Info,
  },
  { key: 'forNgos', label: t.forNgos, href: NAVBAR_PATHS.forNgos, icon: Store },
] as const;

const MENU_FOOTER = [
  [t.aboutDemo, NAVBAR_PATHS.aboutDemo],
  [t.terms, NAVBAR_PATHS.terms],
  [t.privacy, NAVBAR_PATHS.privacy],
] as const;

function useSession(fetchStatus: () => Promise<SessionStatus>) {
  const [session, setSession] = useState<SessionStatus>(VISITOR);

  useEffect(() => {
    let live = true;
    void fetchStatus().then((next) => {
      if (live) setSession(next);
    });
    return () => {
      live = false;
    };
  }, [fetchStatus]);

  return session;
}

function useScrolled(solid: boolean) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (solid) return;
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [solid]);

  return solid || scrolled;
}

function Avatar({ url, width }: { url?: string; width: number }) {
  return (
    <PinPhoto
      width={width}
      // The api serves a small WebP (PERF-02). Decorative: the name goes with it.
      image={
        url ? (
          <img
            src={url}
            alt=""
            width={width}
            height={Math.round(width * 1.3)}
          />
        ) : undefined
      }
      icon={url ? undefined : <PawPrint className="size-4" />}
      className="bg-surface-2 text-fg-muted"
    />
  );
}

/**
 * Figcraft "Navbar" (12-navbar-*): sticky, clear at the top and filled with a
 * shadow after scrolling. Desktop: logo, the three links and "Entrar" +
 * "Cadastrar minha ONG", or "Área da ONG" when logged in. Phone: logo, the
 * NGO's avatar when logged in and ≡, which opens the full-screen menu.
 */
export function Navbar({
  current,
  solid = false,
  logoutAction,
  fetchStatus = fetchSessionStatus,
  className,
}: NavbarProps) {
  const session = useSession(fetchStatus);
  const raised = useScrolled(solid);

  return (
    <header
      data-slot="navbar"
      data-raised={raised}
      className={cn(
        'sticky top-0 z-[1100] h-16 shrink-0 border-b pr-2 pl-4 transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none lg:h-20 lg:px-gutter dark:bg-nav',
        raised
          ? 'border-fg/8 bg-nav shadow-nav'
          : 'border-transparent bg-transparent',
        className,
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[75rem] items-center gap-6">
        <Link
          href={NAVBAR_PATHS.home}
          className="touch-target inline-flex shrink-0 items-center"
        >
          <Logo />
        </Link>
        <nav aria-label={t.nav} className="hidden lg:block">
          <ul className="flex items-center gap-2">
            {LINKS.map(({ key, label, href }) => {
              const active = key === current;
              return (
                <li key={key}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex h-12 items-center rounded-full px-3.5 font-bold text-fg hover:bg-subtle',
                      active &&
                        'bg-brand-soft text-brand-text hover:bg-brand-soft',
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div
          data-slot="navbar-actions"
          className="ml-auto flex items-center gap-3 max-lg:gap-1"
        >
          {session.loggedIn ? (
            <Link
              href={NAVBAR_PATHS.ngoArea}
              className="touch-target inline-flex items-center gap-2.5 rounded-full lg:min-h-13 lg:border-[1.5px] lg:border-fg lg:py-1.5 lg:pr-5 lg:pl-3 lg:hover:bg-subtle"
            >
              <Avatar url={session.avatarUrl} width={34} />
              <span className="flex flex-col max-lg:sr-only">
                <span className="leading-5 font-bold">{t.ngoArea}</span>{' '}
                <span className="max-w-40 truncate text-xs text-fg-secondary">
                  {session.name}
                </span>
              </span>
            </Link>
          ) : (
            <>
              <Link
                href={NAVBAR_PATHS.login}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'max-lg:hidden',
                )}
              >
                {t.login}
              </Link>
              <Link
                href={NAVBAR_PATHS.signup}
                className={cn(buttonVariants(), 'max-lg:hidden')}
              >
                {t.signup}
              </Link>
            </>
          )}
          <NavbarMenu
            current={current}
            session={session}
            logoutAction={logoutAction}
          />
        </div>
      </div>
    </header>
  );
}

interface NavbarMenuProps {
  current: NavbarProps['current'];
  session: SessionStatus;
  logoutAction: () => Promise<void>;
}

const MENU_BUTTON = 'w-full';
const MENU_OUTLINE =
  'w-full border-on-brand-deep text-on-brand-deep hover:bg-on-brand-deep/10';

/**
 * The phone menu (figcraft "Navbar/Menu mobile"): a modal dialog over the whole
 * screen, in verde-mata escuro. Base UI traps the focus, closes it with Esc
 * and gives the focus back to ≡; the links close it on the way out.
 */
function NavbarMenu({ current, session, logoutAction }: NavbarMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={t.openMenu}
        className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-fg hover:bg-subtle lg:hidden"
      >
        <Menu aria-hidden="true" className="size-7" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup
          aria-label={t.menu}
          // Base UI makes the rest of the page inert; the attribute tells screen readers too.
          aria-modal="true"
          className="fixed inset-0 z-[1200] flex flex-col overflow-y-auto overscroll-contain bg-nav-menu px-4 pt-[env(safe-area-inset-top)] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-on-brand-deep transition-[opacity,translate] duration-200 data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 motion-reduce:transition-none lg:hidden [&_:focus-visible]:outline-on-brand-deep"
        >
          <div className="flex h-16 items-center justify-between">
            <Logo variant="light" />
            <Dialog.Close
              aria-label={t.closeMenu}
              className="touch-target -mr-2 inline-flex items-center justify-center rounded-full hover:bg-on-brand-deep/10"
            >
              <X aria-hidden="true" className="size-7" />
            </Dialog.Close>
          </div>
          <nav aria-label={t.nav} className="mt-4">
            <ul className="flex flex-col gap-1">
              {LINKS.map(({ key, label, href, icon: Icon }) => {
                const active = key === current;
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-14 items-center gap-4 rounded-full px-5 text-xl font-bold hover:bg-on-brand-deep/10',
                        active && 'bg-brand text-on-brand hover:bg-brand',
                      )}
                    >
                      <Icon aria-hidden="true" className="size-6 shrink-0" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-auto flex flex-col gap-3 pt-10">
            {session.loggedIn ? (
              <>
                {/* SPEC_DEVIATION: the figcraft shows the e-mail too; /session/status only gives the name (SEC-03). */}
                <div className="mb-1 flex items-center gap-3">
                  <Avatar url={session.avatarUrl} width={40} />
                  <p className="truncate text-lg font-bold">{session.name}</p>
                </div>
                <Link
                  href={NAVBAR_PATHS.ngoArea}
                  onClick={close}
                  className={cn(buttonVariants(), MENU_BUTTON)}
                >
                  {t.goToNgoArea}
                </Link>
                {/* AUTH-05: a plain form, so "Sair" works before hydration. */}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      MENU_OUTLINE,
                    )}
                  >
                    {t.logout}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={NAVBAR_PATHS.signup}
                  onClick={close}
                  className={cn(buttonVariants(), MENU_BUTTON)}
                >
                  {t.signup}
                </Link>
                <Link
                  href={NAVBAR_PATHS.login}
                  onClick={close}
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    MENU_OUTLINE,
                  )}
                >
                  {t.login}
                </Link>
              </>
            )}
            <ul className="mt-3 flex flex-wrap gap-x-4">
              {MENU_FOOTER.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={close}
                    className="touch-target inline-flex items-center px-1 text-on-brand-deep-soft hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
