import { isValidElement, Suspense, type ReactElement } from 'react';
import { AboutDemoContainer } from '@/features/demo';
import AboutDemoPage, { metadata } from './page';

vi.mock('@/features/demo', () => ({
  AboutDemoContainer: () => null,
  demoDictionary: { about: { metaTitle: 'Sobre a demonstração' } },
}));

describe('/sobre-a-demo', () => {
  it('carrega o container das cotas dentro de um Suspense', () => {
    const page = AboutDemoPage() as ReactElement<{ children: ReactElement }>;

    expect(page.type).toBe(Suspense);
    expect(isValidElement(page.props.children)).toBe(true);
    expect(page.props.children.type).toBe(AboutDemoContainer);
  });

  it('tem o título da página', () => {
    expect(metadata.title).toBe('Sobre a demonstração');
  });
});
