import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import { PadronService } from '../../../padron/services/padron.service';
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
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './jornada.component.html',
})
export default class JornadaComponent implements OnInit, OnDestroy {
  private _electionsService = inject(ElectionsService);
  private _jornadaService = inject(JornadaService);
  private _padronService = inject(PadronService);
  private _snackBar = inject(MatSnackBar);
  private _institutionalDialog = inject(InstitutionalDialogService);

  elecciones: Eleccion[] = [];
  estado: JornadaEstado | null = null;
  loading = false;
  working = false;

  selectedIdCtrl = new FormControl<string>('', { nonNullable: true });

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
    this._run(this._jornadaService.iniciarVotacion(this.estado.eleccion.id));
  }

  generarEnviarCredenciales(): void {
    if (!this.estado) return;
    const eleccionId = this.estado.eleccion.id;
    this._institutionalDialog
      .confirm({
        title: 'Generar y enviar credenciales',
        message:
          'Se generará una contraseña única para cada elector pendiente y se enviará a su correo institucional.',
        confirmText: 'Generar y enviar',
        icon: 'heroicons_outline:envelope',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.working = true;
        this._padronService
          .reenviarCredencialesPendientes(eleccionId)
          .pipe(finalize(() => (this.working = false)))
          .subscribe({
            next: (res) => {
              this._notify(
                `Proceso terminado. Enviadas: ${res.enviadas}; fallidas: ${res.fallidas}; sin correo: ${res.sinCorreo}.`,
              );
              this.loadEstado(eleccionId);
            },
            error: (err) =>
              this._notify(
                this._msg(
                  err,
                  'No se pudieron generar y enviar las credenciales.',
                ),
              ),
          });
      });
  }

  cerrarVotacion(): void {
    if (!this.estado) return;
    const eleccionId = this.estado.eleccion.id;
    this._institutionalDialog.confirm({
      title: 'Cerrar jornada de votación',
      message: 'Los electores ya no podrán votar después de confirmar el cierre.',
      confirmText: 'Cerrar votación',
      danger: true,
    }).subscribe((confirmed) => {
      if (confirmed) this._run(this._jornadaService.cerrarVotacion(eleccionId));
    });
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
    const eleccionId = this.estado.eleccion.id;
    this._institutionalDialog.confirm({
      title: 'Reiniciar jornada electoral',
      message: 'Esta acción elimina todos los votos registrados y reabre la configuración. No se puede deshacer.',
      confirmText: 'Reiniciar y borrar votos',
      danger: true,
      icon: 'heroicons_outline:exclamation-triangle',
    }).subscribe((confirmed) => {
      if (confirmed) this._run(this._jornadaService.reiniciar(eleccionId));
    });
  }

  private applyEstado(estado: JornadaEstado): void {
    this.estado = estado;
    this.setupCountdown();
  }

  get inicioProgramado(): string | null {
    return this.estado?.cronograma?.fechaInicioVotacion ?? null;
  }

  get cierreProgramado(): string | null {
    return this.estado?.cronograma?.fechaFinVotacion ?? null;
  }

  get publicacionProgramada(): string | null {
    return this.estado?.cronograma?.fechaPublicacionResultados ?? null;
  }

  get puedeIniciarPorFecha(): boolean {
    if (!this.inicioProgramado || !this.cierreProgramado) return false;
    const now = Date.now();
    return (
      now >= new Date(this.inicioProgramado).getTime() &&
      now < new Date(this.cierreProgramado).getTime()
    );
  }

  get puedePublicarPorFecha(): boolean {
    return (
      !!this.publicacionProgramada &&
      Date.now() >= new Date(this.publicacionProgramada).getTime()
    );
  }

  get puedeCerrarPorFecha(): boolean {
    return (
      !!this.cierreProgramado &&
      Date.now() >= new Date(this.cierreProgramado).getTime()
    );
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

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private _msg(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
