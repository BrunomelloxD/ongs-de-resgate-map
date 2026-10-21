// Checks what lint can't: required stories, the .client.tsx rule, literal colors
// and the page gutter. An optional argument points to another src (used by its spec).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, basename, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const src = process.argv[2] ? resolve(process.argv[2]) : join(root, 'src');
const relative_ = (file) => join('src', relative(src, file));

// Next special files that must be Client Components and can't take the suffix.
const NEXT_CLIENT_FILES = new Set(['error.tsx', 'global-error.tsx']);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const isTestOrStory = (file) => /\.(spec|stories)\.tsx?$/.test(file);
const usesClientDirective = (file) =>
  /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8'));

const files = walk(src).filter(
  (file) => file.endsWith('.tsx') && !isTestOrStory(file),
);
const errors = [];

for (const file of files) {
  const rel = relative_(file);
  const isComponent =
    rel.startsWith('src/components/ui/') ||
    /^src\/features\/[^/]+\/components\//.test(rel);

  if (isComponent && !existsSync(file.replace(/\.tsx$/, '.stories.tsx'))) {
    errors.push(
      `${rel}: falta a story (${basename(file, '.tsx')}.stories.tsx).`,
    );
  }

  const isClientFile = file.endsWith('.client.tsx');
  const hasDirective = usesClientDirective(file);
  const isNextSpecial =
    rel.startsWith('src/app/') && NEXT_CLIENT_FILES.has(basename(file));

  if (hasDirective && !isClientFile && !isNextSpecial) {
    errors.push(
      `${rel}: tem 'use client' mas o nome não termina em .client.tsx.`,
    );
  }
  if (isClientFile && !hasDirective) {
    errors.push(
      `${rel}: termina em .client.tsx mas não começa com 'use client'.`,
    );
  }
}

// Feature UI uses only theme tokens, so both themes stay in sync.
const TOKEN_ONLY_SCOPE =
  /^src\/(features\/|components\/ui\/(avatar|theme-toggle)[^/]*$)/;
const LITERAL_COLOR_VALUES = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb|color)\(/,
];

// Every Tailwind v4 utility that takes a color. Longest first, so `ring-offset`
// wins over `ring` and `inset-shadow` over `shadow`.
const COLOR_PREFIXES = [
  'border-[xytrblse]',
  'inset-shadow',
  'inset-ring',
  'drop-shadow',
  'ring-offset',
  'decoration',
  'placeholder',
  'outline',
  'divide',
  'shadow',
  'border',
  'accent',
  'stroke',
  'caret',
  'text',
  'ring',
  'fill',
  'from',
  'via',
  'bg',
  'to',
];
const COLOR_UTILITY = new RegExp(
  `(?:^|[\\s"'\`:!{(,])-?(${COLOR_PREFIXES.join('|')})-(\\[[^\\]]*\\]|[^\\s"'\`}),]+)`,
  'g',
);
const PALETTE =
  /^(slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}$/;
// Bare-word arbitrary values that are not colors (`outline-[none]`).
const NON_COLOR_KEYWORDS = new Set([
  'none',
  'inherit',
  'initial',
  'unset',
  'transparent',
  'currentcolor',
]);

// The allow side: the theme's own colors (`--color-*` in globals.css).
const THEME_COLORS = new Set(
  Array.from(
    readFileSync(join(src, 'app/globals.css'), 'utf8').matchAll(
      /--color-([a-z0-9-]+)\s*:/g,
    ),
    (m) => m[1],
  ),
);

function literalColorUtility(value) {
  if (value.startsWith('[')) {
    const inner = value.slice(1, -1).toLowerCase();
    if (inner.startsWith('color:')) return true;
    return /^[a-z]+$/.test(inner) && !NON_COLOR_KEYWORDS.has(inner);
  }
  const name = value.split('/')[0];
  if (THEME_COLORS.has(name)) return false;
  return PALETTE.test(name) || name === 'white' || name === 'black';
}

function findLiteralColor(content) {
  for (const pattern of LITERAL_COLOR_VALUES) {
    const match = content.match(pattern);
    if (match) return match[0];
  }
  for (const [, prefix, value] of content.matchAll(COLOR_UTILITY)) {
    if (literalColorUtility(value)) return `${prefix}-${value}`;
  }
  return null;
}

const tokenOnlyFiles = walk(src).filter((file) =>
  TOKEN_ONLY_SCOPE.test(relative_(file)),
);

for (const file of tokenOnlyFiles) {
  const literal = findLiteralColor(readFileSync(file, 'utf8'));
  if (literal) {
    errors.push(
      `${relative_(file)}: cor literal "${literal}"; use os tokens do tema.`,
    );
  }
}

// px-gutter is 120px on desktop: inside a max-w-* column it eats the content.
// Full-width containers take the gutter; narrow columns use px-4.
function classNameValues(content) {
  const values = [];
  for (const match of content.matchAll(/className=(["'{])/g)) {
    const start = match.index + match[0].length;
    if (match[1] !== '{') {
      values.push(content.slice(start, content.indexOf(match[1], start)));
      continue;
    }
    let depth = 1;
    let end = start;
    while (depth > 0 && end < content.length) {
      if (content[end] === '{') depth++;
      if (content[end] === '}') depth--;
      end++;
    }
    values.push(content.slice(start, end - 1));
  }
  return values;
}

const GUTTER = /(?:^|[\s"'`:])px-gutter(?=$|[\s"'`])/;
const MAX_WIDTH = /(?:^|[\s"'`:])max-w-/;

for (const file of walk(src).filter((f) => f.endsWith('.tsx'))) {
  const mixed = classNameValues(readFileSync(file, 'utf8')).find(
    (value) => GUTTER.test(value) && MAX_WIDTH.test(value),
  );
  if (mixed) {
    errors.push(
      `${relative_(file)}: px-gutter junto de max-w-* no mesmo className ("${mixed.trim()}"); use px-4 na coluna estreita e deixe o px-gutter no contêiner de largura total.`,
    );
  }
}

if (errors.length > 0) {
  console.error(
    `Convenções do web violadas:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
  );
  process.exit(1);
}

console.log(`Convenções OK (${files.length} arquivos verificados).`);
