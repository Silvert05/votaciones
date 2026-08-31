import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { NotifyService } from 'app/shared/services/notify.service';
import { finalize } from 'rxjs';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import {
  CandidatoTarjeton,
  DignidadTarjeton,
  TarjetonResponse,
  TipoVoto,
} from '../../models/votacion.model';
import { VotacionService } from '../../services/votacion.service';

type SeleccionValue = 'BLANCO' | 'NULO' | `CANDIDATO:${string}`;

@Component({
  selector: 'admin-votacion',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './votacion.component.html',
})
export default class VotacionComponent implements OnInit {
  private _electionsService = inject(ElectionsService);
  private _votacionService = inject(VotacionService);
  private _notifyService = inject(NotifyService);
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _institutionalDialog = inject(InstitutionalDialogService);

  elecciones: Eleccion[] = [];
  tarjeton: TarjetonResponse | null = null;
  selecciones: Record<string, SeleccionValue> = {};
  loading = false;
  saving = false;

  selectedEleccionCtrl = new FormControl<string>('', { nonNullable: true });
  identificacionCtrl = new FormControl('', [
    Validators.required,
    Validators.maxLength(20),
  ]);

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedEleccionCtrl.valueChanges.subscribe(() => {
      this.tarjeton = null;
      this.selecciones = {};
    });
  }

  loadElecciones(): void {
    this._electionsService.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.elecciones = res.data;
        if (!this.selectedEleccionCtrl.value && res.data.length) {
          this.selectedEleccionCtrl.setValue(res.data[0].id);
        }
      },
      error: () => this._notifyError('No se pudieron cargar las elecciones.'),
    });
  }

  abrir(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._votacionService.abrir(eleccionId).subscribe({
      next: () => {
        this._notify('Jornada de votación abierta.');
        this.loadElecciones();
      },
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo abrir la votación.')),
    });
  }

  cerrar(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._institutionalDialog.confirm({
      title: 'Cerrar jornada de votación',
      message: 'Después del cierre, los electores ya no podrán registrar su voto.',
      confirmText: 'Cerrar jornada',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this._votacionService.cerrar(eleccionId).subscribe({
        next: () => {
          this._notify('Jornada de votación cerrada.');
          this.loadElecciones();
        },
        error: (err) =>
          this._notifyError(this.errorMessage(err, 'No se pudo cerrar la votación.')),
      });
    });
  }

  cargarTarjeton(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this._notify('Selecciona una elección.');
      return;
    }
    if (this.identificacionCtrl.invalid) {
      this.identificacionCtrl.markAsTouched();
      return;
    }

    this.loading = true;
    this._votacionService
      .tarjeton(eleccionId, this.identificacionCtrl.value?.trim())
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (tarjeton) => {
          this.tarjeton = tarjeton;
          this.selecciones = {};
          for (const dignidad of tarjeton.dignidades) {
            this.selecciones[dignidad.id] = 'BLANCO';
          }
        },
        error: (err) =>
          this._notifyError(this.errorMessage(err, 'No se pudo cargar el tarjetón.')),
      });
  }

  emitir(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId || !this.tarjeton) {
      this._notify('Carga un tarjetón primero.');
      return;
    }
    const identificacion = this.identificacionCtrl.value?.trim();
    if (!identificacion) {
      this._notify('Ingresa la identificación.');
      return;
    }

    const votos = this.tarjeton.dignidades.map((dignidad) => {
      const value = this.selecciones[dignidad.id] ?? 'BLANCO';
      if (value.startsWith('CANDIDATO:')) {
        return {
          dignidadId: dignidad.id,
          tipo: 'CANDIDATO' as TipoVoto,
          candidaturaId: value.replace('CANDIDATO:', ''),
        };
      }
      return {
        dignidadId: dignidad.id,
        tipo: value as TipoVoto,
        candidaturaId: null,
      };
    });

    this.saving = true;
    this._votacionService
      .emitir(eleccionId, { identificacion, votos })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          this._notify(`Voto registrado para ${res.dignidades} dignidades.`);
          this.tarjeton = null;
          this.selecciones = {};
          this.identificacionCtrl.reset('');
        },
        error: (err) =>
          this._notifyError(this.errorMessage(err, 'No se pudo registrar el voto.')),
      });
  }

  candidatoLabel(candidato: CandidatoTarjeton): string {
    const elector = candidato.elector;
    const lista = candidato.lista
      ? ` - ${candidato.lista.codigo} ${candidato.lista.nombre}`
      : '';
    return `${elector.apellidos} ${elector.nombres}${lista}`;
  }

  yaVoto(dignidad: DignidadTarjeton): boolean {
    return !!this.tarjeton?.votosEmitidos.includes(dignidad.id);
  }

  label(value: string | null | undefined): string {
    if (!value) return '-';
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private _notify(message: string): void {
    this._notifyService.success(message);
  }

  private _notifyError(message: string): void {
    this._notifyService.error(message);
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
