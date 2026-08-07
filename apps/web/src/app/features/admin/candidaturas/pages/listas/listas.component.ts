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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotifyService } from 'app/shared/services/notify.service';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import {
  DignidadListaEstado,
  ESTADOS_LISTA,
  EstadoListaElectoral,
  ListaElectoral,
  ListasQuery,
} from '../../models/candidatura.model';
import { CandidaturasService } from '../../services/candidaturas.service';

@Component({
  selector: 'admin-listas-electorales',
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
    MatSlideToggleModule,
  ],
  templateUrl: './listas.component.html',
})
export default class ListasComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _candidaturasService = inject(CandidaturasService);
  private _notifyService = inject(NotifyService);
  private _institutionalDialog = inject(InstitutionalDialogService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = ['codigo', 'nombre', 'estado', 'candidaturas', 'acciones'];
  readonly estados = ESTADOS_LISTA;

  elecciones: Eleccion[] = [];
  listas: ListaElectoral[] = [];
  selected: ListaElectoral | null = null;
  dignidadesLista: DignidadListaEstado[] = [];
  total = 0;
  loading = false;
  saving = false;

  selectedEleccionCtrl = new FormControl<string>('');
  searchCtrl = new FormControl('');
  estadoCtrl = new FormControl<EstadoListaElectoral | ''>('');

  form = this._fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(160)]],
    color: [
      '#2563eb',
      [Validators.maxLength(20), Validators.pattern(/^#[0-9a-fA-F]{6}$/)],
    ],
    descripcion: [''],
    propuesta: [''],
    estado: ['BORRADOR' as EstadoListaElectoral],
    observacion: [''],
  });

  private _query: ListasQuery = { page: 1, limit: 10 };

  ngOnInit(): void {
    this.loadElecciones();
    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this._query.page = 1;
        this.load();
      });
    this.selectedEleccionCtrl.valueChanges.subscribe(() => {
      this._query.page = 1;
      this.newLista();
      this.load();
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

  load(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this.listas = [];
      this.total = 0;
      return;
    }
    this.loading = true;
    this._query.search = this.searchCtrl.value || undefined;
    this._query.estado = (this.estadoCtrl.value as EstadoListaElectoral) || undefined;

    this._candidaturasService
      .listListas(eleccionId, this._query)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.listas = res.data;
          this.total = res.total;
        },
        error: () => this._notifyError('No se pudieron cargar las listas.'),
      });
  }

  onFilterChange(): void {
    this._query.page = 1;
    this.load();
  }

  onPage(e: PageEvent): void {
    this._query.page = e.pageIndex + 1;
    this._query.limit = e.pageSize;
    this.load();
  }

  get pageIndex(): number {
    return (this._query.page ?? 1) - 1;
  }

  get pageSize(): number {
    return this._query.limit ?? 10;
  }

  abrirCandidaturas(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._candidaturasService.abrir(eleccionId).subscribe({
      next: () => {
        this._notify('Inscripcion de candidaturas abierta.');
        this.loadElecciones();
      },
      error: (err) => this._notifyError(this.errorMessage(err, 'No se pudo abrir candidaturas.')),
    });
  }

  newLista(): void {
    this.selected = null;
    this.dignidadesLista = [];
    this.form.reset({
      codigo: '',
      nombre: '',
      color: '#2563eb',
      descripcion: '',
      propuesta: '',
      estado: 'BORRADOR',
      observacion: '',
    });
  }

  select(lista: ListaElectoral): void {
    this.selected = lista;
    this.form.reset({
      codigo: lista.codigo,
      nombre: lista.nombre,
      color: lista.color ?? '#2563eb',
      descripcion: lista.descripcion ?? '',
      propuesta: lista.propuesta ?? '',
      estado: lista.estado,
      observacion: lista.observacion ?? '',
    });
    this.loadDignidadesLista();
  }

  loadDignidadesLista(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId || !this.selected) {
      this.dignidadesLista = [];
      return;
    }
    this._candidaturasService
      .listDignidadesPorLista(eleccionId, this.selected.id)
      .subscribe({
        next: (res) => (this.dignidadesLista = res),
        error: () => this._notifyError('No se pudieron cargar las dignidades de la lista.'),
      });
  }

  toggleDignidad(dignidad: DignidadListaEstado): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId || !this.selected) return;
    const habilitado = !dignidad.habilitado;
    this._candidaturasService
      .setDignidadHabilitada(eleccionId, this.selected.id, dignidad.id, {
        habilitado,
      })
      .subscribe({
        next: () => {
          dignidad.habilitado = habilitado;
          this._notify(
            `Dignidad ${habilitado ? 'habilitada' : 'inhabilitada'} para la lista.`,
          );
        },
        error: (err) =>
          this._notifyError(this.errorMessage(err, 'No se pudo cambiar el estado.')),
      });
  }

  save(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this._notify('Selecciona una eleccion.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      codigo: raw.codigo!,
      nombre: raw.nombre!,
      color: raw.color || null,
      descripcion: raw.descripcion || null,
      propuesta: raw.propuesta || null,
      ...(this.selected
        ? { estado: raw.estado!, observacion: raw.observacion || null }
        : {}),
    };

    const isEdit = !!this.selected;
    this.saving = true;
    const request$ = this.selected
      ? this._candidaturasService.updateLista(eleccionId, this.selected.id, payload)
      : this._candidaturasService.createLista(eleccionId, payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (lista) => {
        this.selected = lista;
        this._notify(isEdit ? 'Lista actualizada.' : 'Lista creada.');
        this.load();
      },
      error: (err) => this._notifyError(this.errorMessage(err, 'No se pudo guardar.')),
    });
  }

  cambiarEstado(lista: ListaElectoral, estado: EstadoListaElectoral): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._institutionalDialog.prompt({
      title: `${this.label(estado)} lista`,
      message: `Registre una observación para la lista ${lista.nombre}.`,
      inputLabel: 'Observación del cambio de estado',
      initialValue: lista.observacion ?? '',
      confirmText: 'Guardar cambio',
      icon: 'heroicons_outline:clipboard-document-check',
    }).subscribe((observacion) => {
      if (observacion === null) return;
      this._candidaturasService
        .updateLista(eleccionId, lista.id, { estado, observacion: observacion || null })
        .subscribe({
          next: () => {
            this._notify(`Lista marcada como ${this.label(estado)}.`);
            this.load();
          },
          error: (err) => this._notifyError(this.errorMessage(err, 'No se pudo cambiar el estado.')),
        });
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

  estadoClass(estado: EstadoListaElectoral): string {
    const base = 'inline-flex rounded px-2 py-1 text-xs font-semibold';
    if (estado === 'CALIFICADA') return `${base} bg-green-100 text-green-700`;
    if (estado === 'RECHAZADA' || estado === 'RETIRADA') return `${base} bg-red-100 text-red-700`;
    if (estado === 'INSCRITA') return `${base} bg-blue-100 text-blue-700`;
    return `${base} bg-slate-100 text-slate-700`;
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
