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

const DEFAULT_PRIMARIO = '#1e3a8a';
const DEFAULT_SECUNDARIO = '#0f172a';
const DEFAULT_ACENTO = '#f59e0b';

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

export function buildHeader(branding: Branding, titulo: string): Content[] {
  const escudo = branding.escudoDataUri
    ? { image: 'escudo', width: 48, alignment: 'left' as const }
    : { text: '', width: 48 };
  const logo = branding.logoDataUri
    ? { image: 'logo', width: 48, alignment: 'right' as const }
    : { text: '', width: 48 };

  return [
    {
      columns: [
        { ...escudo, width: 48 },
        {
          width: '*',
          alignment: 'center',
          stack: [
            {
              text: branding.nombreInstitucion.toUpperCase(),
              bold: true,
              fontSize: 13,
            },
            { text: branding.eleccionNombre, fontSize: 10, margin: [0, 2, 0, 0] },
          ],
        },
        { ...logo, width: 48 },
      ],
      margin: [0, 0, 0, 10],
    },
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
  return function footer(currentPage: number, pageCount: number): Content {
    return {
      columns: [
        {
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 60,
              h: 10,
              color: branding.colorAcento,
            },
            {
              type: 'rect',
              x: 60,
              y: 0,
              w: 30,
              h: 10,
              color: branding.colorSecundario,
            },
          ],
        },
        {
          text: `Pagina ${currentPage} de ${pageCount}`,
          alignment: 'right',
          fontSize: 8,
          color: '#64748b',
          margin: [0, 0, 40, 0],
        },
      ],
      margin: [40, 0, 40, 20],
    };
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
