import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
import {
  Eleccion,
  TIPOS_ELECTOR,
  TipoElector,
} from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import {
  ESTADOS_PADRON,
  Elector,
  EstadoPadronElector,
  PadronElectoralItem,
  PadronQuery,
} from '../../models/padron.model';
import { PadronService } from '../../services/padron.service';

@Component({
  selector: 'admin-election-roll',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './election-roll.component.html',
})
export default class ElectionRollComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _padronService = inject(PadronService);
  private _snackBar = inject(MatSnackBar);
  private _institutionalDialog = inject(InstitutionalDialogService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = [
    'identificacion',
    'nombre',
    'email',
    'tipo',
    'estado',
    'credencial',
    'acciones',
  ];
  readonly estados = ESTADOS_PADRON;
  readonly tipos = TIPOS_ELECTOR;

  elecciones: Eleccion[] = [];
  electores: Elector[] = [];
  padron: PadronElectoralItem[] = [];
  selectedPadron: PadronElectoralItem | null = null;
  total = 0;
  loading = false;
  saving = false;

  selectedEleccionCtrl = new FormControl<string>('');
  searchCtrl = new FormControl('');
  estadoCtrl = new FormControl<EstadoPadronElector | ''>('');
  tipoCtrl = new FormControl<TipoElector | ''>('');
  asignarCtrl = new FormControl<string[]>([], { nonNullable: true });

  form = this._fb.group({
    estado: ['HABILITADO' as EstadoPadronElector, Validators.required],
    motivo: [''],
    observacion: [''],
  });

  private _query: PadronQuery = { page: 1, limit: 10 };

  ngOnInit(): void {
    this.loadElecciones();
    this.loadElectores();
    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this._query.page = 1;
        this.loadPadron();
      });
    this.selectedEleccionCtrl.valueChanges.subscribe(() => {
      this._query.page = 1;
      this.selectedPadron = null;
      this.loadPadron();
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
      error: () => this._notify('No se pudieron cargar las elecciones.'),
    });
  }

  loadElectores(): void {
    this._padronService.listElectores({ page: 1, limit: 100, activo: true }).subscribe({
      next: (res) => {
        this.electores = res.data;
      },
      error: () => this._notify('No se pudieron cargar los electores activos.'),
    });
  }

  loadPadron(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this.padron = [];
      this.total = 0;
      return;
    }

    this.loading = true;
    this._query.search = this.searchCtrl.value || undefined;
    this._query.estado =
      (this.estadoCtrl.value as EstadoPadronElector) || undefined;
    this._query.tipo = (this.tipoCtrl.value as TipoElector) || undefined;

    this._padronService
      .listPadron(eleccionId, this._query)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.padron = res.data;
          this.total = res.total;
        },
        error: () => this._notify('No se pudo cargar el padron.'),
      });
  }

  onFilterChange(): void {
    this._query.page = 1;
    this.loadPadron();
  }

  onPage(e: PageEvent): void {
    this._query.page = e.pageIndex + 1;
    this._query.limit = e.pageSize;
    this.loadPadron();
  }

  get pageIndex(): number {
    return (this._query.page ?? 1) - 1;
  }

  get pageSize(): number {
    return this._query.limit ?? 10;
  }

  asignar(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    const electorIds = this.asignarCtrl.value;
    if (!eleccionId || !electorIds.length) {
      this._notify('Selecciona una eleccion y al menos un elector.');
      return;
    }

    this._padronService.asignarElectores(eleccionId, electorIds).subscribe({
      next: (res) => {
        this.asignarCtrl.setValue([]);
        this._notify(`Electores asignados: ${res.asignados}.`);
        this.loadPadron();
      },
      error: (err) =>
        this._notify(this.errorMessage(err, 'No se pudieron asignar electores.')),
    });
  }

  autoGenerar(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this._notify('Selecciona una eleccion.');
      return;
    }

    this._padronService.autoGenerar(eleccionId).subscribe({
      next: (res) => {
        this._notify(`Padron generado. Nuevos: ${res.autogenerados}.`);
        this.loadPadron();
      },
      error: (err) =>
        this._notify(this.errorMessage(err, 'No se pudo generar el padron.')),
    });
  }

  publicar(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this._notify('Selecciona una eleccion.');
      return;
    }
    this._institutionalDialog.confirm({
      title: 'Publicar padrón electoral',
      message: 'El padrón quedará publicado. Las credenciales se generarán posteriormente y solo desde Jornada electoral.',
      confirmText: 'Publicar padrón',
      icon: 'heroicons_outline:user-group',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this._padronService.publicar(eleccionId).subscribe({
        next: (res) => {
          this._notify(`Padrón publicado con ${res.habilitados} electores.`);
          this.loadPadron();
          this.loadElecciones();
        },
        error: (err) =>
          this._notify(this.errorMessage(err, 'No se pudo publicar el padrón.')),
      });
    });
  }

  reenviarPendientes(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._padronService.reenviarCredencialesPendientes(eleccionId).subscribe({
      next: (res) => {
        this._notify(
          `Reenvío completado. Enviadas: ${res.enviadas}; fallidas: ${res.fallidas}; sin correo: ${res.sinCorreo}.`,
        );
        this.loadPadron();
      },
      error: (err) =>
        this._notify(this.errorMessage(err, 'No se pudieron reenviar las credenciales.')),
    });
  }

  enviarCredencial(item: PadronElectoralItem): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._institutionalDialog.confirm({
      title: 'Enviar nueva credencial',
      message: `Se invalidará la contraseña anterior y se enviará una nueva a ${item.elector.email ?? 'su correo'}.`,
      confirmText: 'Generar y enviar',
      icon: 'heroicons_outline:envelope',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this._padronService.enviarCredencial(eleccionId, item.id).subscribe({
        next: () => {
          this._notify('Nueva credencial enviada correctamente.');
          this.loadPadron();
        },
        error: (err) =>
          this._notify(this.errorMessage(err, 'No se pudo enviar la credencial.')),
      });
    });
  }

  edit(item: PadronElectoralItem): void {
    this.selectedPadron = item;
    this.form.reset({
      estado: item.estado,
      motivo: item.motivo ?? '',
      observacion: item.observacion ?? '',
    });
  }

  saveEstado(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId || !this.selectedPadron) {
      this._notify('Selecciona un elector del padron.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this._padronService
      .updatePadronElector(eleccionId, this.selectedPadron.id, {
        estado: raw.estado!,
        motivo: raw.motivo || null,
        observacion: raw.observacion || null,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (item) => {
          this.selectedPadron = item;
          this._notify('Estado del padron actualizado.');
          this.loadPadron();
        },
        error: (err) =>
          this._notify(this.errorMessage(err, 'No se pudo actualizar el estado.')),
      });
  }

  label(value: string | null | undefined): string {
    if (!value) return '-';
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  }

  estadoClass(estado: EstadoPadronElector): string {
    const base = 'inline-flex rounded px-2 py-1 text-xs font-semibold';
    if (estado === 'HABILITADO') return `${base} bg-green-100 text-green-700`;
    if (estado === 'OBSERVADO') return `${base} bg-amber-100 text-amber-700`;
    return `${base} bg-red-100 text-red-700`;
  }

  credencialLabel(item: PadronElectoralItem): string {
    if (item.credencialRevocadaAt) return 'Revocada';
    if (item.credencialEnvioError) return 'Error de envío';
    if (item.credencialEnviadaAt) return 'Enviada';
    if (item.credencialGeneradaAt) return 'Pendiente de envío';
    return 'No generada';
  }

  credencialClass(item: PadronElectoralItem): string {
    const base = 'inline-flex rounded px-2 py-1 text-xs font-semibold';
    if (item.credencialRevocadaAt) return `${base} bg-slate-100 text-slate-700`;
    if (item.credencialEnvioError) return `${base} bg-red-100 text-red-700`;
    if (item.credencialEnviadaAt) return `${base} bg-green-100 text-green-700`;
    return `${base} bg-amber-100 text-amber-700`;
  }

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
