import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { isValidElement, Suspense, type ReactElement } from 'react';
import { LiveRegion } from '@/components/ui/live-region.client';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { server, TEST_API_URL } from '../../test/msw/server';
import RootLayout, { metadata, viewport } from './layout';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));

vi.mock('./fonts', () => ({
  figtree: { variable: 'font-figtree-var' },
  bricolage: { variable: 'font-bricolage-var' },
}));

type Element<P = Record<string, unknown>> = ReactElement<P>;

function renderLayout() {
  // <html> can't render inside RTL's container: assert on the returned tree.
  const html = RootLayout({
    children: <p>conteúdo</p>,
    params: Promise.resolve({}),
  }) as Element<{
    lang: string;
    className: string;
    suppressHydrationWarning?: boolean;
    children: Element<{ children: Element }>[];
  }>;
  const [head, body] = html.props.children;

  return { html, head: head!, body: body! };
}

describe('RootLayout', () => {
  it('define o idioma e envolve o conteúdo no body', () => {
    const { html, body } = renderLayout();

    expect(html.type).toBe('html');
    expect(html.props.lang).toBe('pt-BR');
    expect(body.type).toBe('body');
    expect(isValidElement(body.props.children)).toBe(true);
  });

  it('aplica as variáveis das fontes do Design System no html', () => {
    const { html } = renderLayout();

    expect(html.props.className).toContain('font-figtree-var');
    expect(html.props.className).toContain('font-bricolage-var');
  });

  it('cobre a área segura sem travar o zoom', () => {
    expect(viewport.viewportFit).toBe('cover');
    expect(viewport).not.toHaveProperty('maximumScale');
  });

  it('aceita o data-theme aplicado pelo script antes da hidratação', () => {
    expect(renderLayout().html.props.suppressHydrationWarning).toBe(true);
  });

  it('roda o script de tema no <head>', () => {
    const { head } = renderLayout();
    const script = head.props.children as Element<{
      dangerouslySetInnerHTML: { __html: string };
    }>;

    expect(head.type).toBe('head');
    expect(script.type).toBe('script');
    expect(script.props.dangerouslySetInnerHTML.__html).toBe(THEME_INIT_SCRIPT);
  });

  it('não lê dados da requisição (AD-001)', () => {
    const source = readFileSync(path.join(__dirname, 'layout.tsx'), 'utf8');

    expect(source).not.toContain('next/headers');
  });

  it('usa "Animal Helper" como título e template', () => {
    expect(metadata.title).toEqual({
      default: 'Animal Helper',
      template: '%s | Animal Helper',
    });
  });

  it('não bloqueia o zoom (A11Y-10)', () => {
    expect(viewport).not.toHaveProperty('maximumScale');
    expect(viewport.userScalable).not.toBe(false);
  });

  it('envolve as páginas no provider da LiveRegion (A11Y-06)', () => {
    const { body } = renderLayout();

    expect(body.props.children.type).toBe(LiveRegion);
  });

  describe('faixa da demo', () => {
    function bannerSlot() {
      const { body } = renderLayout();
      const [suspense] = (
        body.props.children as Element<{ children: Element[] }>
      ).props.children;
      const container = (suspense as Element<{ children: Element }>).props
        .children as Element & { type: () => Promise<ReactElement | null> };

      return { suspense: suspense!, render: () => container.type() };
    }

    function demoApi(enabled: boolean) {
      server.use(
        http.get(`${TEST_API_URL}/api/v1/demo`, () =>
          HttpResponse.json({
            enabled,
            retentionDays: 7,
            quotas: {
              maxNgos: 30,
              signupsPerIpPerDay: 2,
              maxAnimalsPerNgo: 10,
              maxImagesPerAnimal: 3,
              maxUploadMb: 5,
              maxStorageMb: 500,
            },
          }),
        ),
      );
    }

    it('fica num Suspense, fora do shell estático', () => {
      expect(bannerSlot().suspense.type).toBe(Suspense);
    });

    it('demo ligada (DEMO-01): mostra a faixa em todas as páginas', async () => {
      demoApi(true);

      render((await bannerSlot().render())!);

      expect(
        screen.getByRole('link', {
          name: 'Demonstração: os dados são apagados em 7 dias',
        }),
      ).toHaveAttribute('href', '/sobre-a-demo');
    });

    it('demo desligada (DEMO-20): sem faixa', async () => {
      demoApi(false);

      await expect(bannerSlot().render()).resolves.toBeNull();
    });
  });
});
