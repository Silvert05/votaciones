import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotifyService } from 'app/shared/services/notify.service';
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
    MatTooltipModule,
  ],
  templateUrl: './jornada.component.html',
})
export default class JornadaComponent implements OnInit, OnDestroy {
  private _electionsService = inject(ElectionsService);
  private _jornadaService = inject(JornadaService);
  private _padronService = inject(PadronService);
  private _notifyService = inject(NotifyService);
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _institutionalDialog = inject(InstitutionalDialogService);

  elecciones: Eleccion[] = [];
  estado: JornadaEstado | null = null;
  loading = false;
  working = false;

  selectedIdCtrl = new FormControl<string>('', { nonNullable: true });

  pasos: PasoInfo[] = [
    { numero: 1, titulo: 'Inicializar Jornada', icono: 'lucide:play' },
    { numero: 2, titulo: 'Puesta a Cero', icono: 'lucide:scale' },
    { numero: 3, titulo: 'Iniciar Votación', icono: 'lucide:mouse-pointer-click' },
    { numero: 4, titulo: 'Cierre de Votación', icono: 'lucide:lock' },
    { numero: 5, titulo: 'Resultados Electorales', icono: 'lucide:chart-bar' },
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
      error: () => this._notifyError('No se pudieron cargar las elecciones.'),
    });
  }

  loadEstado(id: string): void {
    this.loading = true;
    this._jornadaService
      .estado(id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (estado) => this.applyEstado(estado),
        error: (err) =>
          this._notifyError(this._msg(err, 'No se pudo cargar la jornada.')),
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
    this._changeDetectorRef.detectChanges();
    obs
      .pipe(
        finalize(() => {
          this.working = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (estado: JornadaEstado) => {
          this.applyEstado(estado);
          this._notify('Acción aplicada correctamente.');
        },
        error: (err: any) => this._notifyError(this._msg(err, 'No se pudo completar la acción.')),
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

  iniciarVotacionAnticipada(): void {
    if (!this.estado) return;
    const eleccionId = this.estado.eleccion.id;
    const fecha = this.inicioProgramado
      ? new Date(this.inicioProgramado).toLocaleString('es-EC')
      : 'la fecha configurada en el cronograma';
    this._institutionalDialog.confirm({
      title: 'Iniciar votación antes de lo programado',
      message: `Vas a abrir la votación antes de lo programado en el cronograma (${fecha}). Los electores ya podrán votar. ¿Continuar?`,
      confirmText: 'Iniciar anticipadamente',
      danger: true,
    }).subscribe((confirmed) => {
      if (confirmed) {
        this._run(this._jornadaService.iniciarVotacion(eleccionId, { forzar: true }));
      }
    });
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
        icon: 'lucide:mail',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.working = true;
        this._changeDetectorRef.detectChanges();
        this._padronService
          .reenviarCredencialesPendientes(eleccionId)
          .pipe(
            finalize(() => {
              this.working = false;
              this._changeDetectorRef.detectChanges();
            }),
          )
          .subscribe({
            next: (res) => {
              this._notify(
                `Proceso terminado. Enviadas: ${res.enviadas}; fallidas: ${res.fallidas}; sin correo: ${res.sinCorreo}.`,
              );
              this.loadEstado(eleccionId);
            },
            error: (err) =>
              this._notifyError(
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

  cerrarVotacionAnticipada(): void {
    if (!this.estado) return;
    const eleccionId = this.estado.eleccion.id;
    const fecha = this.cierreProgramado
      ? new Date(this.cierreProgramado).toLocaleString('es-EC')
      : 'la fecha configurada en el cronograma';
    this._institutionalDialog.confirm({
      title: 'Cerrar votación antes de lo programado',
      message: `Vas a cerrar la votación antes de lo programado en el cronograma (${fecha}). Los electores ya no podrán votar. ¿Continuar?`,
      confirmText: 'Cerrar anticipadamente',
      danger: true,
    }).subscribe((confirmed) => {
      if (confirmed) {
        this._run(this._jornadaService.cerrarVotacion(eleccionId, { forzar: true }));
      }
    });
  }

  generarResultados(): void {
    if (!this.estado) return;
    this._run(this._jornadaService.generarResultados(this.estado.eleccion.id));
  }

  generarResultadosAnticipado(): void {
    if (!this.estado) return;
    const eleccionId = this.estado.eleccion.id;
    const fecha = this.publicacionProgramada
      ? new Date(this.publicacionProgramada).toLocaleString('es-EC')
      : 'la fecha configurada en el cronograma';
    this._institutionalDialog.confirm({
      title: 'Publicar resultados antes de lo programado',
      message: `Vas a publicar los resultados antes de lo programado en el cronograma (${fecha}). ¿Continuar?`,
      confirmText: 'Publicar anticipadamente',
      danger: true,
    }).subscribe((confirmed) => {
      if (confirmed) {
        this._run(this._jornadaService.generarResultados(eleccionId, { forzar: true }));
      }
    });
  }

  reactivarLink(): void {
    if (!this.estado) return;
    this._run(this._jornadaService.reactivarLink(this.estado.eleccion.id));
  }

  reiniciar(): void {
    if (!this.estado) return;
    const eleccionId = this.estado.eleccion.id;
    this._institutionalDialog.prompt({
      title: 'Reiniciar jornada electoral',
      message: 'Esta acción elimina todos los votos registrados y reabre la configuración. No se puede deshacer. Indique el motivo del reinicio.',
      inputLabel: 'Motivo del reinicio',
      confirmText: 'Reiniciar y borrar votos',
      required: true,
      icon: 'lucide:triangle-alert',
    }).subscribe((motivo) => {
      if (motivo) this._run(this._jornadaService.reiniciar(eleccionId, motivo));
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
    this._notifyService.success(message);
  }

  private _notifyError(message: string): void {
    this._notifyService.error(message);
  }

  private _msg(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
