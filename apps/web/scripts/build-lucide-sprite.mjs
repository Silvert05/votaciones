// Genera apps/web/public/icons/lucide.svg a partir de los SVG individuales de
// lucide-static, siguiendo el mismo formato de sprite (<svg id="..."> dentro
// de <defs>) que ya usan los demas sets de iconos del proyecto
// (apps/web/public/icons/heroicons-outline.svg, etc.), registrados en
// apps/web/src/@core/services/icons/icons.service.ts.
//
// Ejecutar con: pnpm -C apps/web run icons:build
// Editar la lista ICONS si se necesita agregar/quitar iconos.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Nombres de icono de lucide-static (sin extension) usados en el proyecto.
const ICONS = [
  'arrow-left',
  'arrow-right',
  'badge-check',
  'book-open',
  'calendar-days',
  'house',
  'chart-bar',
  'chart-pie',
  'check',
  'check-circle',
  'chevron-down',
  'chevron-right',
  'chevron-up',
  'circle-plus',
  'clipboard-check',
  'clipboard-list',
  'clock',
  'cloud-upload',
  'download',
  'ellipsis-vertical',
  'eye',
  'eye-off',
  'file-check',
  'file-chart-column',
  'file-down',
  'file-plus',
  'file-text',
  'file-up',
  'fingerprint',
  'flag',
  'graduation-cap',
  'grid-2x2',
  'hand',
  'help-circle',
  'id-card',
  'image',
  'inbox',
  'info',
  'key',
  'layers',
  'lightbulb',
  'link',
  'list',
  'lock',
  'lock-open',
  'log-in',
  'log-out',
  'mail',
  'map',
  'maximize',
  'megaphone',
  'menu',
  'mouse-pointer-click',
  'paintbrush',
  'palette',
  'play',
  'plus',
  'printer',
  'refresh-ccw-dot',
  'refresh-cw',
  'scale',
  'search',
  'settings',
  'shield-check',
  'square-pen',
  'trash',
  'triangle-alert',
  'trophy',
  'user',
  'user-circle',
  'user-plus',
  'users',
  'users-round',
  'x',
  'x-circle',
];

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const lucideIconsDir = join(
  dirname(require.resolve('lucide-static/package.json')),
  'icons',
);

function buildSymbol(name) {
  const raw = readFileSync(join(lucideIconsDir, `${name}.svg`), 'utf8');
  const openTagMatch = raw.match(/<svg([\s\S]*?)>/);
  const innerMatch = raw.match(/<svg[\s\S]*?>([\s\S]*)<\/svg>/);
  if (!openTagMatch || !innerMatch) {
    throw new Error(`No se pudo parsear el icono lucide "${name}"`);
  }
  const attrs = openTagMatch[1]
    .replace(/\s*class="[^"]*"/, '')
    .replace(/\s*width="[^"]*"/, '')
    .replace(/\s*height="[^"]*"/, '')
    .replace(/\s*xmlns="[^"]*"/, '')
    .trim();
  const inner = innerMatch[1].trim();
  return `        <svg id="${name}" xmlns="http://www.w3.org/2000/svg" ${attrs} aria-hidden="true">\n            ${inner}\n        </svg>`;
}

const symbols = ICONS.map(buildSymbol).join('\n');
const sprite = `<!-- @formatter:off -->\n<svg xmlns="http://www.w3.org/2000/svg">\n    <defs>\n${symbols}\n    </defs>\n</svg>\n`;

const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'lucide.svg');
writeFileSync(outFile, sprite, 'utf8');

console.log(`Generado ${outFile} con ${ICONS.length} iconos de lucide-static.`);
