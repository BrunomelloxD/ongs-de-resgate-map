import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.join(__dirname, 'globals.css'), 'utf8');

// Design System tokens from .specs/front/index.figcraft (light). The figcraft
// file has no dark theme, so the dark column is derived (SPEC_DEVIATION, T63).
const TOKENS: Record<string, { light: string; dark: string }> = {
  '--bg-page': { light: '#F5F3EE', dark: '#0F1713' },
  '--bg-surface': { light: '#FFFFFF', dark: '#17241E' },
  '--bg-subtle': { light: '#ECE8DF', dark: '#1E2D25' },
  '--bg-surface-2': { light: '#E3DED2', dark: '#26382E' },
  '--border-default': { light: '#8C8578', dark: '#7F8D84' },
  '--text-primary': { light: '#17241E', dark: '#F5F3EE' },
  '--text-secondary': { light: '#46524C', dark: '#C4CCC6' },
  '--text-muted': { light: '#596359', dark: '#A9B3AC' },
  '--text-button': { light: '#17241E', dark: '#F5F3EE' },
  '--brand-default': { light: '#F5B82E', dark: '#F5B82E' },
  '--brand-soft': { light: '#DCE7E0', dark: '#1E3A2D' },
  '--brand-text': { light: '#1F4D3A', dark: '#F5B82E' },
  '--brand-ring': { light: '#1F4D3A4D', dark: '#F5B82E4D' },
  '--brand-deep': { light: '#1F4D3A', dark: '#2E6B52' },
  '--brand-deep-pressed': { light: '#163A2B', dark: '#245843' },
  '--focus-ring': { light: '#1F4D3A', dark: '#F5B82E' },
  '--text-on-brand': { light: '#17241E', dark: '#17241E' },
  '--text-on-brand-deep': { light: '#FFFFFF', dark: '#FFFFFF' },
  // T172: supporting text of the green AuthShell panel (#DCE7E0 in the figcraft).
  '--text-on-brand-deep-soft': { light: '#DCE7E0', dark: '#DCE7E0' },
  '--gem-soft': { light: '#FCEBC0', dark: '#3A2E0E' },
  '--gem-soft-text': { light: '#17241E', dark: '#F5B82E' },
  '--available': { light: '#2E7D4F', dark: '#7FD1A0' },
  '--available-soft': { light: '#DDEFE3', dark: '#153324' },
  '--available-text': { light: '#1F6B40', dark: '#7FD1A0' },
  '--error': { light: '#B83A2E', dark: '#F0847A' },
  '--error-soft': { light: '#F6DEDA', dark: '#3A1814' },
  '--error-text': { light: '#9E2F25', dark: '#F4A79F' },
  '--status-online': { light: '#10B981', dark: '#34D399' },
  // T180: Button/Danger, Button/Disabled and Toggle/Off of the Design System.
  '--danger': { light: '#B83A2E', dark: '#B83A2E' },
  '--text-on-danger': { light: '#FFFFFF', dark: '#FFFFFF' },
  '--text-disabled': { light: '#565C58', dark: '#A9B3AC' },
  '--switch-off': { light: '#7D8580', dark: '#7D8580' },
  // T181: map pins sit on the light tiles in both themes.
  '--visitor': { light: '#2F6FDE', dark: '#2F6FDE' },
  '--pin-open': { light: '#1F4D3A', dark: '#1F4D3A' },
  '--pin-closed': { light: '#5F6964', dark: '#5F6964' },
  '--pin-closed-dot': { light: '#ECE8DF', dark: '#ECE8DF' },
  '--shadow-card': { light: '#1118270F', dark: '#00000066' },
  '--avatar-pink-bg': { light: '#FCE7F3', dark: '#500724' },
  '--avatar-pink-fg': { light: '#BE185D', dark: '#F9A8D4' },
  '--avatar-green-bg': { light: '#DCFCE7', dark: '#052E16' },
  '--avatar-green-fg': { light: '#15803D', dark: '#86EFAC' },
};

function block(pattern: RegExp): Record<string, string> {
  const body = css.match(pattern)?.[1];
  if (body === undefined) throw new Error(`Bloco não encontrado: ${pattern}`);

  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value!.trim().toUpperCase(),
    ]),
  );
}

// Anchored at the start of a line, so the nested selectors of @custom-variant don't match.
const SELECTORS = {
  ':root': block(/^:root \{([^}]*)\}/m),
  "[data-theme='dark']": block(/^\[data-theme='dark'\] \{([^}]*)\}/m),
  '@media (prefers-color-scheme: dark) :root:not([data-theme])': block(
    /^@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\) \{([^}]*)\}/m,
  ),
};

const THEMES = {
  light: SELECTORS[':root'],
  dark: SELECTORS["[data-theme='dark']"],
};

describe('tokens de cor em globals.css', () => {
  describe.each(Object.entries(TOKENS))('%s', (name, expected) => {
    it('tem o valor Light em :root', () => {
      expect(SELECTORS[':root'][name]).toBe(expected.light);
    });

    it("tem o valor Dark em [data-theme='dark']", () => {
      expect(SELECTORS["[data-theme='dark']"][name]).toBe(expected.dark);
    });

    it('tem o valor Dark em :root:not([data-theme]) sob prefers-color-scheme: dark', () => {
      expect(
        SELECTORS[
          '@media (prefers-color-scheme: dark) :root:not([data-theme])'
        ][name],
      ).toBe(expected.dark);
    });
  });

  it('não usa mais a classe .dark do shadcn', () => {
    expect(css).not.toMatch(/^\.dark\b/m);
    expect(css).not.toContain('.dark *');
  });

  it('o variant dark segue data-theme e o sistema', () => {
    const variant = css.match(/@custom-variant dark \{([\s\S]*?)\n\}/)?.[1];

    expect(variant).toContain("[data-theme='dark']");
    expect(variant).toMatch(
      /@media \(prefers-color-scheme: dark\)[\s\S]*:root:not\(\[data-theme\]\)/,
    );
  });

  it.each([
    ['--background', 'var(--bg-page)'],
    ['--foreground', 'var(--text-primary)'],
    ['--card', 'var(--bg-surface)'],
    ['--primary', 'var(--brand-default)'],
    ['--primary-foreground', 'var(--text-on-brand)'],
    ['--muted-foreground', 'var(--text-secondary)'],
    ['--border', 'var(--border-default)'],
    ['--input', 'var(--border-default)'],
    ['--ring', 'var(--focus-ring)'],
    ['--destructive', 'var(--error-text)'],
  ])('a variável do shadcn %s aponta para %s', (name, value) => {
    expect(SELECTORS[':root'][name]).toBe(value.toUpperCase());
  });
});

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('contraste WCAG AA (A11Y-01)', () => {
  // Text token → backgrounds it is drawn on.
  const TEXT_PAIRS: [string, string[]][] = [
    ['--text-primary', ['--bg-page', '--bg-surface', '--bg-subtle']],
    ['--text-secondary', ['--bg-page', '--bg-surface', '--bg-subtle']],
    ['--text-muted', ['--bg-page', '--bg-surface', '--bg-subtle']],
    ['--text-button', ['--bg-page', '--bg-surface']],
    ['--text-on-brand', ['--brand-default']],
    ['--text-on-brand-deep', ['--brand-deep', '--brand-deep-pressed']],
    ['--text-on-brand-deep-soft', ['--brand-deep']],
    ['--brand-text', ['--bg-page', '--bg-surface', '--brand-soft']],
    ['--available-text', ['--available-soft', '--bg-page']],
    ['--error-text', ['--error-soft', '--bg-page']],
    ['--gem-soft-text', ['--gem-soft']],
    ['--text-on-danger', ['--danger']],
    ['--text-disabled', ['--bg-surface-2']],
    ['--avatar-pink-fg', ['--avatar-pink-bg']],
    ['--avatar-green-fg', ['--avatar-green-bg']],
  ];

  describe.each(Object.entries(THEMES))(
    'tema %s: texto ≥ 4,5:1',
    (_theme, vars) => {
      it.each(
        TEXT_PAIRS.flatMap(([fg, bgs]) => bgs.map((bg) => [fg, bg] as const)),
      )('%s sobre %s', (fg, bg) => {
        expect(contrast(vars[fg]!, vars[bg]!)).toBeGreaterThanOrEqual(4.5);
      });
    },
  );

  // Component borders, focus ring and informative icons need 3:1.
  const NON_TEXT_PAIRS: [string, string[]][] = [
    ['--border-default', ['--bg-page', '--bg-surface']],
    ['--focus-ring', ['--bg-page', '--bg-surface', '--bg-subtle']],
    ['--error', ['--bg-page', '--bg-surface']],
    ['--available', ['--bg-page', '--bg-surface']],
    ['--switch-off', ['--bg-page', '--bg-surface']],
  ];

  describe.each(Object.entries(THEMES))(
    'tema %s: bordas, anel de foco e ícones ≥ 3:1',
    (_theme, vars) => {
      it.each(
        NON_TEXT_PAIRS.flatMap(([fg, bgs]) =>
          bgs.map((bg) => [fg, bg] as const),
        ),
      )('%s sobre %s', (fg, bg) => {
        expect(contrast(vars[fg]!, vars[bg]!)).toBeGreaterThanOrEqual(3);
      });
    },
  );
});

describe('foco, alvo de toque e área segura', () => {
  it(':focus-visible usa outline-width de 3px (A11Y-03)', () => {
    const rule = css.match(/^\s*:focus-visible \{([^}]*)\}/m)?.[1];

    expect(rule).toMatch(/outline-width:\s*3px/);
    expect(rule).toMatch(/outline-style:\s*solid/);
    expect(rule).toContain('var(--focus-ring)');
  });

  it('define o alvo mínimo de 44px (A11Y-02)', () => {
    expect(css).toMatch(/--target-min:\s*44px/);
    expect(css).toMatch(
      /@utility touch-target \{[^}]*min-height:\s*var\(--target-min\)/,
    );
    expect(css).toMatch(
      /@utility touch-target \{[^}]*min-width:\s*var\(--target-min\)/,
    );
  });

  it('T183: no celular o body reserva o espaço da ActionBar fixa, com a área segura', () => {
    const rule =
      css.match(/@media \(width < 64rem\) \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(rule).toMatch(
      /body:has\(\[data-slot='action-bar'\]\) \{\s*padding-bottom: calc\(5\.5rem \+ env\(safe-area-inset-bottom\)\)/,
    );
    expect(rule).toMatch(
      /\[data-hint\]\) \{\s*padding-bottom: calc\(8\.5rem \+ env\(safe-area-inset-bottom\)\)/,
    );
  });

  it('respeita o safe-area-inset nas quatro bordas do body', () => {
    const body = css.match(/^\s*body \{([^}]*)\}/m)?.[1] ?? '';

    for (const edge of ['top', 'right', 'bottom', 'left']) {
      expect(body).toContain(`env(safe-area-inset-${edge})`);
    }
  });
});

describe('fontes, raios e margens do Design System', () => {
  it('usa Figtree no texto e Bricolage Grotesque nos títulos, com fallback', () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-figtree,/);
    expect(css).toMatch(/--font-heading:\s*var\(--font-bricolage,/);
    expect(css).toMatch(
      /h1,\s*h2,\s*h3,\s*h4 \{[^}]*font-family:\s*var\(--font-heading\)/,
    );
  });

  it.each([
    ['--radius-card', '1.25rem'],
    ['--radius-sheet', '1.5rem'],
    ['--radius-field', '0.75rem'],
  ])('define o raio %s', (name, value) => {
    expect(css).toContain(`${name}: ${value};`);
  });

  it('a máscara de pino segue a gota do Design System (1:1,3)', () => {
    const rule = css.match(/@utility mask-pin \{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain("viewBox='0 0 100 130'");
    expect(rule).toContain('mask-size: 100% 100%');
  });

  it('a margem lateral é 16px no celular e 120px no desktop', () => {
    expect(css).toMatch(/--page-gutter:\s*1rem/);
    expect(css).toMatch(
      /@media \(min-width: 64rem\) \{\s*:root \{\s*--page-gutter:\s*7\.5rem/,
    );
  });
});
