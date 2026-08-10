import { LOGO_INSTITUCIONAL_BASE64 } from './logo-institucional.base64';

// pdfmake no publica tipos propios; se usan alias locales laxos.
export type Content = any;
export type TableCell = any;

export interface Branding {
  eleccionId: string;
  eleccionNombre: string;
  nombreInstitucion: string;
  colorPrimario: string;
  colorSecundario: string;
  colorAcento: string;
  escudoDataUri: string | null;
  logoDataUri: string | null;
}

// Deben coincidir con los defaults reales de la pantalla de Configuracion
// del administrador (apps/web/.../election-config.component.ts): primario
// es el azul institucional, secundario el naranja y acento el crema claro.
const DEFAULT_PRIMARIO = '#183f84';
const DEFAULT_SECUNDARIO = '#ea580c';
const DEFAULT_ACENTO = '#f3eadc';

const DIRECCION_INSTITUCION =
  'García Moreno S4-35 y Ambato, Centro Histórico. Quito-Ecuador';
const SITIO_WEB_INSTITUCION = 'www.yavirac.edu.ec';

const COLOR_GRIS_MEMBRETE = '#B7B9BB';
const COLOR_BORDE_PAGINA = '#D9D9D9';

/**
 * El membrete fue especificado como un SVG de 850x1100 (equivalente exacto
 * a carta/LETTER a 100dpi: 850/100=8.5in, 1100/100=11in). `render()` usa
 * `pageSize: 'LETTER'` (612x792pt) para que ESCALA = 72/100 convierta cada
 * coordenada del SVG a puntos PDF de forma exacta, sin aproximaciones.
 */
const ESCALA = 0.72;

/**
 * Geometria compartida del membrete (fondo de pagina) y del pie de pagina,
 * expresada como distancia en puntos desde el borde inferior de la pagina
 * (para que no dependa de si `height` es exactamente 792).
 * pdfmake resuelve `absolutePosition` de forma distinta en `background`
 * (relativo a la pagina completa) y en `footer` (relativo al bloque
 * reservado por `pageMargins[3]`), asi que ambos consumidores de estas
 * constantes deben mantenerse en sincronia con `pageMargins` en `render()`.
 */
export const PAGE_MARGINS = {
  left: 90 * ESCALA,
  right: 90 * ESCALA,
  top: 230 * ESCALA,
  bottom: 792 - 980 * ESCALA,
} as const;
// Altura de la banda azul solida del pie (rect y=1058 h=42 en el SVG fuente).
const FOOTER_BANDA_H = 42 * ESCALA;

export async function fetchImageDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

const DEFAULT_LOGO_DATA_URI = `data:image/png;base64,${LOGO_INSTITUCIONAL_BASE64}`;

/**
 * Logo institucional usado en los reportes cuando la eleccion no tiene
 * logoUrl/escudoUrl configurados en Configuracion. Va embebido como base64
 * directamente en el codigo (ver `logo-institucional.base64.ts`) en lugar
 * de leerse de disco: una lectura de archivo dependia de que `nest build`/
 * `nest start --watch` hubiera copiado el asset a `dist/` antes de la
 * primera peticion, y una falla transitoria ahi dejaba el logo ausente de
 * forma permanente para toda la vida del proceso. Embebido no puede fallar.
 */
export async function getDefaultLogoDataUri(): Promise<string | null> {
  return DEFAULT_LOGO_DATA_URI;
}

/**
 * pdfmake ignora `width`/`alignment` en nodos `text` con `absolutePosition`
 * directo (no ajustan lineas ni centran). Envolverlo en `columns` con el
 * `width` en la columna si permite que el motor calcule el wrap/alineacion
 * y luego se posiciona el conjunto de forma absoluta.
 */
function textoAbsoluto(
  text: string,
  x: number,
  y: number,
  width: number,
  style: Record<string, unknown>,
): Content {
  return {
    columns: [{ width, text, ...style }],
    absolutePosition: { x, y },
  };
}

export function buildImagesDict(branding: Branding): Record<string, string> {
  const images: Record<string, string> = {};
  if (branding.escudoDataUri) images.escudo = branding.escudoDataUri;
  if (branding.logoDataUri) images.logo = branding.logoDataUri;
  return images;
}

export function resolveColores(configuracion: {
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  colorAcento?: string | null;
} | null) {
  return {
    primario: configuracion?.colorPrimario || DEFAULT_PRIMARIO,
    secundario: configuracion?.colorSecundario || DEFAULT_SECUNDARIO,
    acento: configuracion?.colorAcento || DEFAULT_ACENTO,
  };
}

/**
 * Membrete institucional (cintas diagonales de cabecera, logo centrado,
 * marca de agua y pie de pagina con direccion) dibujado como fondo de
 * pagina para que se repita identico en todas las paginas del PDF y en
 * cualquier reporte del sistema. Geometria calcada punto a punto del SVG
 * de referencia (850x1100 = carta a 100dpi) multiplicando cada coordenada
 * original por ESCALA (72/100).
 */
export function buildPageBackground(branding: Branding) {
  return function background(
    currentPage: number,
    pageSize: { width: number; height: number },
  ): Content {
    const { width, height } = pageSize;
    const s = (v: number) => v * ESCALA;
    // El SVG fuente mide 850x1100 (=carta a 100dpi); esta funcion reubica
    // una coordenada Y del SVG conservando su distancia al borde inferior,
    // por si `height` llegara a diferir de 792 (carta a 72dpi).
    const yDesdeAbajo = (svgY: number) => height - (1100 * ESCALA - s(svgY));

    const items: Content[] = [
      // Marco gris sutil alrededor de toda la pagina (SVG: x=4 y=4 w=842 h=1092)
      {
        canvas: [
          {
            type: 'rect',
            x: s(4),
            y: s(4),
            w: s(842),
            h: s(1092),
            lineColor: COLOR_BORDE_PAGINA,
            lineWidth: s(2),
          },
        ],
        absolutePosition: { x: 0, y: 0 },
      },
      // Marca de agua circular tenue (SVG: circle cx=640 cy=790 r=270 + cruz)
      {
        canvas: [
          {
            type: 'ellipse',
            x: s(640),
            y: s(790),
            r1: s(270),
            r2: s(270),
            lineColor: branding.colorPrimario,
            lineWidth: s(65),
            strokeOpacity: 0.05,
          },
          {
            type: 'rect',
            x: s(565),
            y: s(720),
            w: s(150),
            h: s(34),
            color: branding.colorPrimario,
            fillOpacity: 0.05,
          },
          {
            type: 'rect',
            x: s(623),
            y: s(663),
            w: s(34),
            h: s(150),
            color: branding.colorPrimario,
            fillOpacity: 0.05,
          },
        ],
        absolutePosition: { x: 0, y: 0 },
      },
      // Encabezado: franja naranja, franja gris diagonal, franja azul con lema
      {
        absolutePosition: { x: 0, y: 0 },
        canvas: [
          {
            type: 'polyline',
            closePath: true,
            color: branding.colorSecundario,
            points: [
              { x: s(0), y: s(0) },
              { x: s(560), y: s(0) },
              { x: s(500), y: s(78) },
              { x: s(0), y: s(78) },
            ],
          },
          {
            type: 'polyline',
            closePath: true,
            color: COLOR_GRIS_MEMBRETE,
            points: [
              { x: s(560), y: s(0) },
              { x: s(650), y: s(0) },
              { x: s(590), y: s(78) },
              { x: s(500), y: s(78) },
            ],
          },
          {
            type: 'polyline',
            closePath: true,
            color: branding.colorPrimario,
            points: [
              { x: s(650), y: s(0) },
              { x: s(850), y: s(0) },
              { x: s(850), y: s(78) },
              { x: s(590), y: s(78) },
            ],
          },
        ],
      },
      // Lema institucional dentro de la franja azul (SVG: x=740 y=42,
      // centrado). Se ubica un poco mas abajo que el SVG porque ahi la
      // franja azul es mas ancha (su borde izquierdo es diagonal), dejando
      // espacio suficiente para que el lema entre en una sola linea.
      textoAbsoluto('¡Fortaleciendo Capacidades!', s(608), s(32), 172, {
        italics: true,
        fontSize: s(13),
        color: 'white',
        alignment: 'center',
      }),
    ];

    if (branding.logoDataUri) {
      // Espacio reservado para el logo en el SVG: x=300 y=90 w=250 h=115.
      // El logo institucional ya incluye el nombre en la propia imagen, asi
      // que se muestra solo, ajustado por aspecto dentro de ese recuadro.
      const boxX = s(300);
      const boxY = s(90);
      const boxW = s(250);
      const boxH = s(115);
      const aspecto = 597 / 418; // dimensiones reales de logo.png
      let logoW = boxW;
      let logoH = logoW / aspecto;
      if (logoH > boxH) {
        logoH = boxH;
        logoW = logoH * aspecto;
      }
      items.push({
        image: 'logo',
        width: logoW,
        absolutePosition: {
          x: boxX + (boxW - logoW) / 2,
          y: boxY + (boxH - logoH) / 2,
        },
      });
    }

    // Pie de pagina (SVG: banda azul y=1058 h=42; franja gris y franja
    // naranja diagonales por encima, de ancho completo).
    items.push({
      absolutePosition: { x: 0, y: 0 },
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: height - FOOTER_BANDA_H,
          w: width,
          h: FOOTER_BANDA_H,
          color: branding.colorPrimario,
        },
        {
          type: 'polyline',
          closePath: true,
          color: COLOR_GRIS_MEMBRETE,
          points: [
            { x: 0, y: yDesdeAbajo(1038) },
            { x: width, y: yDesdeAbajo(988) },
            { x: width, y: yDesdeAbajo(1006) },
            { x: 0, y: yDesdeAbajo(1056) },
          ],
        },
        {
          type: 'polyline',
          closePath: true,
          color: branding.colorSecundario,
          points: [
            { x: 0, y: yDesdeAbajo(1020) },
            { x: width, y: yDesdeAbajo(965) },
            { x: width, y: yDesdeAbajo(988) },
            { x: 0, y: yDesdeAbajo(1043) },
          ],
        },
      ],
    });

    // Direccion institucional (SVG: x=30 y=1085, dentro de la banda azul)
    items.push(
      textoAbsoluto(
        `${DIRECCION_INSTITUCION}  /  ${SITIO_WEB_INSTITUCION}`,
        s(30),
        height - FOOTER_BANDA_H + (FOOTER_BANDA_H - s(13)) / 2,
        width - s(60),
        { color: 'white', fontSize: s(13) },
      ),
    );

    return items;
  };
}

export function buildHeader(branding: Branding, titulo: string): Content[] {
  return [
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: titulo,
              color: 'white',
              bold: true,
              fontSize: 14,
              alignment: 'center',
              fillColor: branding.colorPrimario,
              margin: [0, 6, 0, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 14],
    },
  ];
}

export function buildFooter(branding: Branding) {
  return function footer(
    currentPage: number,
    pageCount: number,
    pageSize: { width: number; height: number },
  ): Content {
    // A diferencia de `background`, pdfmake posiciona los nodos del
    // `footer` de forma relativa al bloque reservado por `pageMargins[3]`
    // (ver PAGE_MARGINS), no a la pagina completa.
    const localBandTop = PAGE_MARGINS.bottom - FOOTER_BANDA_H;
    return textoAbsoluto(
      `Página ${currentPage} de ${pageCount}`,
      pageSize.width - 120,
      localBandTop + (FOOTER_BANDA_H - 8) / 2,
      100,
      { alignment: 'right', fontSize: 8, color: 'white' },
    );
  };
}

/**
 * Linea de lugar y fecha al estilo de un acta/certificado formal,
 * alineada a la derecha (p. ej. "Quito, 14 de febrero de 2025.").
 */
export function buildFechaLugar(fechaTexto: string, lugar = 'Quito'): Content {
  return {
    text: `${lugar}, ${fechaTexto}.`,
    alignment: 'right',
    fontSize: 10,
    margin: [0, 0, 0, 16],
  };
}

export interface FirmaSlot {
  rol: string;
}

/**
 * Bloque de firmas al pie de un acta, replicando el patron de linea de
 * firma + rol usado en los certificados institucionales.
 */
export function buildFirmas(slots: FirmaSlot[]): Content {
  return {
    columns: slots.map((slot) => ({
      alignment: 'center',
      stack: [
        { text: ' ', margin: [0, 30, 0, 0] },
        {
          canvas: [
            { type: 'line', x1: 10, y1: 0, x2: 170, y2: 0, lineWidth: 1, lineColor: '#0f172a' },
          ],
          margin: [0, 0, 0, 4],
        },
        { text: slot.rol, fontSize: 9, bold: true },
      ],
    })),
    columnGap: 20,
    margin: [0, 30, 0, 10],
  };
}

export function tablaSimple(
  headers: string[],
  rows: TableCell[][],
  widths?: (string | number)[],
): Content {
  return {
    table: {
      headerRows: 1,
      widths: widths ?? headers.map(() => '*'),
      body: [
        headers.map((h) => ({ text: h, bold: true, fillColor: '#eef2ff' })),
        ...rows,
      ],
    },
    layout: {
      hLineColor: () => '#cbd5e1',
      vLineColor: () => '#cbd5e1',
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
    },
    margin: [0, 0, 0, 16],
  };
}

export interface BarItem {
  label: string;
  value: number;
  color: string;
}

export function buildBarChart(items: BarItem[]): Content {
  const chartHeight = 140;
  const chartWidth = 470;
  const gap = 16;
  const barWidth = Math.max(
    24,
    (chartWidth - gap * (items.length + 1)) / Math.max(items.length, 1),
  );
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  const canvas: any[] = [
    {
      type: 'line',
      x1: 0,
      y1: chartHeight,
      x2: chartWidth,
      y2: chartHeight,
      lineWidth: 1,
      lineColor: '#94a3b8',
    },
  ];

  items.forEach((item, idx) => {
    const barHeight = Math.round((item.value / maxVal) * (chartHeight - 24));
    const x = gap + idx * (barWidth + gap);
    const y = chartHeight - barHeight;
    canvas.push({
      type: 'rect',
      x,
      y,
      w: barWidth,
      h: barHeight,
      color: item.color,
    });
  });

  return {
    stack: [
      { canvas },
      {
        columns: items.map((item) => ({
          width: barWidth + gap,
          alignment: 'center',
          fontSize: 8,
          text: [
            { text: `${item.value}\n`, bold: true },
            { text: item.label },
          ],
        })),
      },
    ],
    margin: [0, 4, 0, 16],
  };
}

export function formatPorcentaje(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function porcentaje(valor: number, total: number): number {
  if (!total) return 0;
  return Math.round((valor / total) * 10000) / 100;
}

const PALETA_LISTAS = [
  '#2563eb',
  '#059669',
  '#d946ef',
  '#f97316',
  '#0891b2',
  '#dc2626',
  '#7c3aed',
];

export function colorParaLista(index: number, colorPropio?: string | null) {
  return colorPropio || PALETA_LISTAS[index % PALETA_LISTAS.length];
}
