import { isValidElement, Suspense, type ReactElement } from 'react';
import { Navbar } from '@/components/ui/navbar.client';
import { logout } from '@/features/auth';
import { AboutDemoContainer } from '@/features/demo';
import AboutDemoPage, { metadata } from './page';

vi.mock('@/features/demo', () => ({
  AboutDemoContainer: () => null,
  demoDictionary: { about: { metaTitle: 'Sobre a demonstração' } },
}));

describe('/sobre-a-demo', () => {
  it('carrega o container das cotas dentro de um Suspense', () => {
    // T196: the navbar comes first; the Suspense follows it.
    const [navbar, page] = (
      AboutDemoPage() as ReactElement<{ children: ReactElement[] }>
    ).props.children as [
      ReactElement<{ logoutAction: unknown }>,
      ReactElement<{ children: ReactElement }>,
    ];

    expect(navbar.type).toBe(Navbar);
    expect(navbar.props.logoutAction).toBe(logout);
    expect(page.type).toBe(Suspense);
    expect(isValidElement(page.props.children)).toBe(true);
    expect(page.props.children.type).toBe(AboutDemoContainer);
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Sobre a demonstração');
  });
});
