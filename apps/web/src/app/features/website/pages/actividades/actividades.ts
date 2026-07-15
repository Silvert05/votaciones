import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PublicThemeService } from '../../services/public-theme.service';
import { CronogramaPublico, LandingEleccion, VenpService } from '../../services/venp.service';

interface ActividadCronograma {
  title: string;
  responsable: string;
  lugar: string | null;
  hora: string;
  fecha: Date;
}

interface GrupoActividad {
  key: string;
  fecha: string;
  actividad: ActividadCronograma[];
}

type CampoCronograma = keyof CronogramaPublico;

const EVENTOS: Array<{ campo: CampoCronograma; titulo: string }> = [
  { campo: 'fechaConvocatoria', titulo: 'Convocatoria del proceso electoral' },
  { campo: 'fechaPublicacionPadron', titulo: 'Publicacion del padron electoral' },
  { campo: 'fechaInicioInscripcion', titulo: 'Apertura de candidaturas' },
  { campo: 'fechaFinInscripcion', titulo: 'Cierre de candidaturas' },
  { campo: 'fechaInicioVotacion', titulo: 'Inicio de la jornada de votacion' },
  { campo: 'fechaFinVotacion', titulo: 'Cierre de la jornada de votacion' },
  { campo: 'fechaPublicacionResultados', titulo: 'Publicacion de resultados' },
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
    if (!eleccion?.cronograma) return [];
    const institucion = eleccion.configuracion?.nombreInstitucion ?? 'Instituto Yavirac';
    const eventos = EVENTOS.flatMap(({ campo, titulo }) => {
      const value = eleccion.cronograma?.[campo];
      if (!value) return [];
      const fecha = new Date(value);
      if (Number.isNaN(fecha.getTime())) return [];
      return [{
        title: titulo,
        responsable: 'Comision Electoral',
        lugar: institucion,
        hora: new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false }).format(fecha),
        fecha,
      }];
    }).sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    const grupos = new Map<string, GrupoActividad>();
    for (const evento of eventos) {
      const key = `${evento.fecha.getFullYear()}-${evento.fecha.getMonth()}-${evento.fecha.getDate()}`;
      const grupo = grupos.get(key) ?? {
        key,
        fecha: new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }).format(evento.fecha),
        actividad: [],
      };
      grupo.actividad.push(evento);
      grupos.set(key, grupo);
    }
    return Array.from(grupos.values());
  }
}
