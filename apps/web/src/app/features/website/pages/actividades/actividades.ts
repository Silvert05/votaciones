import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PublicThemeService } from '../../services/public-theme.service';
import { CronogramaPublico, LandingEleccion, VenpService } from '../../services/venp.service';

interface ActividadCronograma {
  title: string;
  responsable: string;
  lugar: string | null;
  hora: string;
  fecha: Date | null;
  fechaFin: Date | null;
  /** Fecha usada para ordenar/agrupar (inicio, o fin si no hay inicio). */
  ancla: Date;
  descripcion: string | null;
}

interface GrupoActividad {
  key: string;
  fecha: string;
  actividad: ActividadCronograma[];
}

type CampoCronograma = keyof CronogramaPublico;

/** Mismos hitos y etiquetas por defecto que la pantalla de administración. */
const EVENTOS: Array<{ campo: CampoCronograma; titulo: string }> = [
  { campo: 'fechaConvocatoria', titulo: 'Convocatoria del proceso' },
  { campo: 'fechaPublicacionPadron', titulo: 'Publicación del padrón' },
  { campo: 'fechaInicioInscripcion', titulo: 'Apertura de candidaturas' },
  { campo: 'fechaFinInscripcion', titulo: 'Cierre de candidaturas' },
  { campo: 'fechaInicioVotacion', titulo: 'Inicio de la votación' },
  { campo: 'fechaFinVotacion', titulo: 'Cierre de la votación' },
  { campo: 'fechaPublicacionResultados', titulo: 'Resultados provisionales' },
  { campo: 'fechaResultadosFinales', titulo: 'Resultados definitivos' },
];

@Component({
  selector: 'app-actividades',
  imports: [MatIconModule],
  templateUrl: './actividades.html',
})
export default class ActividadesComponent implements OnInit {
  private _venp = inject(VenpService);
  private _cdr = inject(ChangeDetectorRef);
  private _theme = inject(PublicThemeService);

  cargando = true;
  eleccion: LandingEleccion | null = null;
  actividad: GrupoActividad[] = [];

  ngOnInit(): void {
    this._venp.listElecciones().subscribe({
      next: (elecciones) => {
        this.eleccion = elecciones.find((item) => item.votarDisponible) ?? elecciones[0] ?? null;
        this._theme.apply(this.eleccion?.configuracion);
        this.actividad = this._crearCronograma(this.eleccion);
        this.cargando = false;
        this._cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this._cdr.detectChanges();
      },
    });
  }

  private _crearCronograma(eleccion: LandingEleccion | null): GrupoActividad[] {
    if (!eleccion) return [];
    const cronograma = eleccion.cronograma;
    const items = eleccion.cronogramaItems ?? [];
    if (!cronograma && !items.length) return [];

    const institucion = eleccion.configuracion?.nombreInstitucion ?? 'Instituto Yavirac';
    const etiquetas = cronograma?.etiquetasHitos ?? {};
    const detalles = cronograma?.detallesHitos ?? {};

    const eventos: ActividadCronograma[] = [];

    const agregar = (
      title: string,
      fecha: Date | null,
      fechaFin: Date | null,
      descripcion: string | null,
    ) => {
      const ancla = fecha ?? fechaFin;
      if (!ancla) return;
      eventos.push({
        title,
        responsable: 'Comisión Electoral',
        lugar: institucion,
        hora: this._hora(ancla),
        fecha,
        fechaFin,
        ancla,
        descripcion,
      });
    };

    // Hitos del proceso — respetan el título y las fechas que configuró el admin.
    for (const { campo, titulo } of EVENTOS) {
      const detalle = detalles[campo] ?? {};
      const valor = cronograma?.[campo];
      const fecha = typeof valor === 'string' ? this._fecha(valor) : null;
      agregar(
        (etiquetas as Record<string, string>)[campo] || titulo,
        fecha,
        this._fecha(detalle.fechaFin),
        detalle.descripcion ?? null,
      );
    }

    // Ítems adicionales que agregó el administrador.
    for (const item of items) {
      agregar(
        item.nombre,
        this._fecha(item.fecha),
        this._fecha(item.fechaFin),
        item.descripcion,
      );
    }

    eventos.sort((a, b) => a.ancla.getTime() - b.ancla.getTime());

    const grupos = new Map<string, GrupoActividad>();
    for (const evento of eventos) {
      const d = evento.ancla;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const grupo = grupos.get(key) ?? {
        key,
        fecha: new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }).format(d),
        actividad: [],
      };
      grupo.actividad.push(evento);
      grupos.set(key, grupo);
    }
    return Array.from(grupos.values());
  }

  private _fecha(value?: string | null): Date | null {
    if (!value) return null;
    const fecha = new Date(value);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private _hora(fecha: Date): string {
    return new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false }).format(fecha);
  }

  formatearFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }).format(fecha);
  }

  /** Fecha completa con hora, para mostrar inicio y fin sin ambigüedad. */
  formatearFechaHora(fecha: Date | null): string {
    if (!fecha) return '';
    return new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
  }
}
