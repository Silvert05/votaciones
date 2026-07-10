import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import { JornadaEstado } from '../../models/jornada.model';
import { JornadaService } from '../../services/jornada.service';

interface PasoInfo {
  numero: number;
  titulo: string;
  icono: string;
}

@Component({
  selector: 'admin-jornada',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './jornada.component.html',
})
export default class JornadaComponent implements OnInit, OnDestroy {
  private _electionsService = inject(ElectionsService);
  private _jornadaService = inject(JornadaService);
  private _snackBar = inject(MatSnackBar);

  elecciones: Eleccion[] = [];
  estado: JornadaEstado | null = null;
  loading = false;
  working = false;

  selectedIdCtrl = new FormControl<string>('', { nonNullable: true });
  fechaFinCtrl = new FormControl<string>('', { nonNullable: true });

  pasos: PasoInfo[] = [
    { numero: 1, titulo: 'Inicializar Jornada', icono: 'heroicons_outline:play' },
    { numero: 2, titulo: 'Puesta a Cero', icono: 'heroicons_outline:scale' },
    { numero: 3, titulo: 'Iniciar Votacion', icono: 'heroicons_outline:cursor-arrow-rays' },
    { numero: 4, titulo: 'Cierre de Votacion', icono: 'heroicons_outline:lock-closed' },
    { numero: 5, titulo: 'Resultados Electorales', icono: 'heroicons_outline:chart-bar' },
  ];

  countdown = '';
  private _timer: any = null;

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedIdCtrl.valueChanges.subscribe((id) => {
      if (id) this.loadEstado(id);
      else this.estado = null;
    });
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
  }

  loadElecciones(): void {
    this._electionsService.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.elecciones = res.data;
        if (!this.selectedIdCtrl.value && res.data.length) {
          this.selectedIdCtrl.setValue(res.data[0].id);
        }
      },
      error: () => this._notify('No se pudieron cargar las elecciones.'),
    });
  }

  loadEstado(id: string): void {
    this.loading = true;
    this._jornadaService
      .estado(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (estado) => this.applyEstado(estado),
        error: (err) =>
          this._notify(this._msg(err, 'No se pudo cargar la jornada.')),
      });
  }

  get pasoActual(): number {
    return this.estado?.pasoActual ?? 1;
  }

  pasoCompletado(numero: number): boolean {
    return numero < this.pasoActual;
  }

  private _run(obs: any): void {
    this.working = true;
    obs.pipe(finalize(() => (this.working = false))).subscribe({
      next: (estado: JornadaEstado) => {
        this.applyEstado(estado);
        this._notify('Accion aplicada correctamente.');
      },
      error: (err: any) => this._notify(this._msg(err, 'No se pudo completar la accion.')),
    });
  }

  inicializar(): void {
    if (!this.estado) return;
    this._run(this._jornadaService.inicializar(this.estado.eleccion.id));
  }

  puestaCero(): void {
    if (!this.estado) return;
    this._run(this._jornadaService.puestaCero(this.estado.eleccion.id));
  }

  iniciarVotacion(): void {
    if (!this.estado) return;
    const fechaFin = this.fechaFinCtrl.value
      ? new Date(this.fechaFinCtrl.value).toISOString()
      : undefined;
    this._run(
      this._jornadaService.iniciarVotacion(this.estado.eleccion.id, {
        fechaFinVotacion: fechaFin,
      }),
    );
  }

  cerrarVotacion(): void {
    if (!this.estado) return;
    if (!confirm('Cerrar la votacion? Los electores ya no podran votar.')) return;
    this._run(this._jornadaService.cerrarVotacion(this.estado.eleccion.id));
  }

  generarResultados(): void {
    if (!this.estado) return;
    this._run(this._jornadaService.generarResultados(this.estado.eleccion.id));
  }

  reactivarLink(): void {
    if (!this.estado) return;
    this._run(this._jornadaService.reactivarLink(this.estado.eleccion.id));
  }

  reiniciar(): void {
    if (!this.estado) return;
    if (!confirm('Reiniciar la jornada BORRA todos los votos y reabre la configuracion. Continuar?'))
      return;
    this._run(this._jornadaService.reiniciar(this.estado.eleccion.id));
  }

  private applyEstado(estado: JornadaEstado): void {
    this.estado = estado;
    this.fechaFinCtrl.setValue(this.toLocal(estado.jornada.fechaFinVotacion));
    this.setupCountdown();
  }

  private setupCountdown(): void {
    if (this._timer) clearInterval(this._timer);
    const tick = () => {
      const fin = this.estado?.jornada.fechaFinVotacion;
      if (!fin || !this.estado?.jornada.linkVotacionActivo) {
        this.countdown = '';
        return;
      }
      const diff = new Date(fin).getTime() - Date.now();
      if (diff <= 0) {
        this.countdown = '00:00:00';
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      this.countdown = [h, m, s]
        .map((n) => String(n).padStart(2, '0'))
        .join(':');
    };
    tick();
    this._timer = setInterval(tick, 1000);
  }

  private toLocal(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private _msg(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
