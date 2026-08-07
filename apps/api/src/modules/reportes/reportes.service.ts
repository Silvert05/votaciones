import { Injectable, NotFoundException } from '@nestjs/common';
import pdfMake from 'pdfmake';
import { EstadoPadronElector, TipoVoto } from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import {
  Branding,
  buildBarChart,
  buildFooter,
  buildHeader,
  buildImagesDict,
  colorParaLista,
  fetchImageDataUri,
  formatPorcentaje,
  porcentaje,
  resolveColores,
  tablaSimple,
} from './reportes.pdf';
import type { Content, TableCell } from './reportes.pdf';

// pdfmake no publica tipos propios para la definicion del documento.
type TDocumentDefinitions = any;

const STANDARD_FONT_FILES = new Set([
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
]);

pdfMake.fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};
pdfMake.setLocalAccessPolicy((path: string) => STANDARD_FONT_FILES.has(path));
pdfMake.setUrlAccessPolicy(() => false);

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async actaPorLista(eleccionId: string) {
    const { branding, fechaTexto } = await this.getBranding(eleccionId);

    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true, requiereLista: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true },
    });

    const habiles = await this.prisma.padronElectoral.count({
      where: {
        eleccionId,
        publicado: true,
        estado: EstadoPadronElector.HABILITADO,
      },
    });

    const content: Content[] = [
      ...buildHeader(branding, 'ACTA DE PROCLAMACION DE RESULTADOS'),
      {
        text: this.narrativaActa(branding, fechaTexto),
        alignment: 'justify',
        fontSize: 10,
        margin: [0, 0, 0, 14],
      },
    ];

    if (!dignidades.length) {
      content.push({
        text: 'La eleccion no tiene dignidades con lista electoral configuradas.',
        italics: true,
      });
    }

    for (const dignidad of dignidades) {
      const participacion = await this.prisma.votoEmitido.count({
        where: { eleccionId, dignidadId: dignidad.id },
      });

      const conteos = await this.prisma.conteoVoto.findMany({
        where: { eleccionId, dignidadId: dignidad.id },
        select: {
          tipo: true,
          total: true,
          candidatura: {
            select: {
              lista: {
                select: { id: true, codigo: true, nombre: true, color: true },
              },
            },
          },
        },
      });

      let blanco = 0;
      let nulo = 0;
      const porLista = new Map();
      for (const conteo of conteos) {
        if (conteo.tipo === TipoVoto.BLANCO) {
          blanco += conteo.total;
          continue;
        }
        if (conteo.tipo === TipoVoto.NULO) {
          nulo += conteo.total;
          continue;
        }
        const lista = conteo.candidatura?.lista;
        if (!lista) continue;
        const previo = porLista.get(lista.id) ?? {
          nombre: `${lista.codigo} - ${lista.nombre}`,
          total: 0,
          color: lista.color,
        };
        previo.total += conteo.total;
        porLista.set(lista.id, previo);
      }

      const listasOrdenadas = [...porLista.values()].sort(
        (a: any, b: any) => b.total - a.total,
      );
      const totalVotos =
        listasOrdenadas.reduce((acc: number, lista: any) => acc + lista.total, 0) +
        blanco +
        nulo;

      if (dignidades.length > 1) {
        content.push({
          text: dignidad.nombre,
          bold: true,
          fontSize: 12,
          margin: [0, 12, 0, 6],
        });
      }

      content.push(
        tablaSimple(
          [
            'Sufragantes Habiles',
            'Participacion Electoral',
            '% Participacion Electoral',
          ],
          [
            [
              { text: String(habiles), alignment: 'center' },
              { text: String(participacion), alignment: 'center' },
              {
                text: formatPorcentaje(porcentaje(participacion, habiles)),
                alignment: 'center',
              },
            ],
          ],
        ),
      );

      const filas: TableCell[][] = [
        ...listasOrdenadas.map((lista: any) => [
          { text: lista.nombre },
          { text: String(lista.total), alignment: 'center' as const },
          {
            text: formatPorcentaje(porcentaje(lista.total, totalVotos)),
            alignment: 'center' as const,
          },
        ]),
        [
          { text: 'Voto en Blanco' },
          { text: String(blanco), alignment: 'center' as const },
          {
            text: formatPorcentaje(porcentaje(blanco, totalVotos)),
            alignment: 'center' as const,
          },
        ],
        [
          { text: 'Voto Nulo' },
          { text: String(nulo), alignment: 'center' as const },
          {
            text: formatPorcentaje(porcentaje(nulo, totalVotos)),
            alignment: 'center' as const,
          },
        ],
        [
          { text: 'Total de Votos Emitidos', bold: true },
          { text: String(totalVotos), bold: true, alignment: 'center' as const },
          { text: '100.00%', bold: true, alignment: 'center' as const },
        ],
      ];

      content.push(
        tablaSimple(['Lista / Candidatos', 'Total Votos', '% Voto Emitido'], filas),
      );

      const barItems = [
        ...listasOrdenadas.map((lista: any, idx: number) => ({
          label: lista.nombre,
          value: lista.total,
          color: colorParaLista(idx, lista.color),
        })),
        { label: 'Voto en Blanco', value: blanco, color: '#94a3b8' },
        { label: 'Voto Nulo', value: nulo, color: '#475569' },
      ];
      content.push(buildBarChart(barItems));
    }

    return this.render(content, branding);
  }

  async participacionPorTipo(eleccionId: string) {
    const { branding, fechaTexto } = await this.getBranding(eleccionId);

    const tipos: Array<{ tipo: 'DOCENTE' | 'ESTUDIANTE'; label: string; color: string }> = [
      { tipo: 'DOCENTE', label: 'Docentes', color: '#2563eb' },
      { tipo: 'ESTUDIANTE', label: 'Estudiantes', color: '#059669' },
    ];

    const filas: TableCell[][] = [];
    const barItems: { label: string; value: number; color: string }[] = [];
    let totalHabiles = 0;
    let totalVotantes = 0;

    for (const item of tipos) {
      const habiles = await this.prisma.padronElectoral.count({
        where: {
          eleccionId,
          publicado: true,
          estado: EstadoPadronElector.HABILITADO,
          elector: { tipo: item.tipo },
        },
      });

      const votantesRows = await this.prisma.votoEmitido.findMany({
        where: { eleccionId, elector: { tipo: item.tipo } },
        distinct: ['electorId'],
        select: { electorId: true },
      });
      const votantes = votantesRows.length;

      totalHabiles += habiles;
      totalVotantes += votantes;

      filas.push([
        { text: item.label },
        { text: String(habiles), alignment: 'center' },
        { text: String(votantes), alignment: 'center' },
        {
          text: formatPorcentaje(porcentaje(votantes, habiles)),
          alignment: 'center',
        },
      ]);

      barItems.push({ label: item.label, value: votantes, color: item.color });
    }

    filas.push([
      { text: 'Total', bold: true },
      { text: String(totalHabiles), bold: true, alignment: 'center' },
      { text: String(totalVotantes), bold: true, alignment: 'center' },
      {
        text: formatPorcentaje(porcentaje(totalVotantes, totalHabiles)),
        bold: true,
        alignment: 'center',
      },
    ]);

    const content: Content[] = [
      ...buildHeader(branding, 'PARTICIPACION POR TIPO DE ELECTOR'),
      {
        text: `Resumen de participacion electoral por tipo de elector correspondiente al proceso "${branding.eleccionNombre}", con corte al ${fechaTexto}.`,
        alignment: 'justify',
        fontSize: 10,
        margin: [0, 0, 0, 14],
      },
      tablaSimple(
        ['Tipo de Elector', 'Habilitados', 'Votantes', '% Participacion'],
        filas,
      ),
      buildBarChart(barItems),
    ];

    return this.render(content, branding);
  }

  async actaPorDignidades(eleccionId: string) {
    const { branding, fechaTexto } = await this.getBranding(eleccionId);

    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        cantidadGanadores: true,
      },
    });

    const content: Content[] = [
      ...buildHeader(branding, 'ACTA DE RESULTADOS POR DIGNIDAD'),
      {
        text: `Detalle de resultados por dignidad del proceso "${branding.eleccionNombre}", con corte al ${fechaTexto}.`,
        alignment: 'justify',
        fontSize: 10,
        margin: [0, 0, 0, 14],
      },
    ];

    if (!dignidades.length) {
      content.push({
        text: 'La eleccion no tiene dignidades configuradas.',
        italics: true,
      });
    }

    for (const dignidad of dignidades) {
      const conteos = await this.prisma.conteoVoto.findMany({
        where: {
          eleccionId,
          dignidadId: dignidad.id,
          tipo: TipoVoto.CANDIDATO,
        },
        orderBy: { total: 'desc' },
        select: {
          total: true,
          candidatura: {
            select: {
              elector: { select: { nombres: true, apellidos: true } },
              lista: { select: { codigo: true, nombre: true } },
            },
          },
        },
      });

      content.push({
        text: dignidad.nombre,
        bold: true,
        fontSize: 12,
        margin: [0, 12, 0, 6],
      });

      if (!conteos.length) {
        content.push({
          text: 'Sin candidaturas calificadas para esta dignidad.',
          italics: true,
          margin: [0, 0, 0, 10],
        });
        continue;
      }

      const filas: TableCell[][] = conteos.map((conteo, idx) => {
        const esGanador = idx < dignidad.cantidadGanadores;
        const nombre = conteo.candidatura?.elector
          ? `${conteo.candidatura.elector.nombres} ${conteo.candidatura.elector.apellidos}`
          : 'N/D';
        const lista = conteo.candidatura?.lista
          ? `${conteo.candidatura.lista.codigo} - ${conteo.candidatura.lista.nombre}`
          : '-';
        return [
          { text: esGanador ? `${nombre} (GANADOR)` : nombre, bold: esGanador },
          { text: lista },
          { text: String(conteo.total), alignment: 'center' as const, bold: esGanador },
        ];
      });

      content.push(
        tablaSimple(['Candidato', 'Lista', 'Votos'], filas, ['*', '*', 80]),
      );
    }

    return this.render(content, branding);
  }

  private async getBranding(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: {
        id: true,
        nombre: true,
        configuracion: {
          select: {
            nombreInstitucion: true,
            logoUrl: true,
            escudoUrl: true,
            colorPrimario: true,
            colorSecundario: true,
            colorAcento: true,
          },
        },
        cronograma: {
          select: {
            fechaFinVotacion: true,
            fechaPublicacionResultados: true,
          },
        },
      },
    });
    if (!eleccion) throw new NotFoundException('Eleccion no encontrada.');

    const [escudoDataUri, logoDataUri] = await Promise.all([
      fetchImageDataUri(eleccion.configuracion?.escudoUrl),
      fetchImageDataUri(eleccion.configuracion?.logoUrl),
    ]);

    const colores = resolveColores(eleccion.configuracion);
    const branding: Branding = {
      eleccionId: eleccion.id,
      eleccionNombre: eleccion.nombre,
      nombreInstitucion:
        eleccion.configuracion?.nombreInstitucion || eleccion.nombre,
      colorPrimario: colores.primario,
      colorSecundario: colores.secundario,
      colorAcento: colores.acento,
      escudoDataUri,
      logoDataUri,
    };

    const fecha =
      eleccion.cronograma?.fechaFinVotacion ??
      eleccion.cronograma?.fechaPublicacionResultados ??
      new Date();
    const fechaTexto = new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(fecha);

    return { branding, fechaTexto };
  }

  private narrativaActa(branding: Branding, fechaTexto: string): string {
    return `Siendo el dia ${fechaTexto}, el Tribunal Electoral de ${branding.nombreInstitucion} certifica y proclama los resultados oficiales del proceso "${branding.eleccionNombre}", de conformidad con el escrutinio de votos realizado.`;
  }

  private render(content: Content[], branding: Branding): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      pageMargins: [40, 40, 40, 60],
      images: buildImagesDict(branding),
      footer: buildFooter(branding),
      defaultStyle: { fontSize: 10 },
      content,
    };
    return pdfMake.createPdf(docDefinition).getBuffer();
  }
}
