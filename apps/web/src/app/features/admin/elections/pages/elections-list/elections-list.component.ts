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
import { NotifyService } from 'app/shared/services/notify.service';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
import {
  ESTADOS_ELECCION,
  ESTADO_TRANSICIONES,
  EstadoEleccion,
  Eleccion,
  EleccionDetalle,
  EleccionesQuery,
  TipoEleccion,
} from '../../models/election.model';
import { ElectionsService } from '../../services/elections.service';

@Component({
  selector: 'admin-elections-list',
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
  templateUrl: './elections-list.component.html',
})
export default class ElectionsListComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _notifyService = inject(NotifyService);
  private _institutionalDialog = inject(InstitutionalDialogService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = [
    'nombre',
    'tipo',
    'estado',
    'dignidades',
    'acciones',
  ];
  readonly estados = ESTADOS_ELECCION;

  elecciones: Eleccion[] = [];
  selected: EleccionDetalle | null = null;
  total = 0;
  loading = false;
  saving = false;

  searchCtrl = new FormControl('');
  estadoCtrl = new FormControl<EstadoEleccion | ''>('');

  form = this._fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(180)]],
    descripcion: [''],
    tipo: ['INSTITUCIONAL' as TipoEleccion, Validators.required],
    vueltaActual: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
  });

  private _query: EleccionesQuery = { page: 1, limit: 10 };

  ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this._query.page = 1;
        this.load();
      });
    this.load();
  }

  load(): void {
    this.loading = true;
    this._query.search = this.searchCtrl.value || undefined;
    this._query.estado =
      (this.estadoCtrl.value as EstadoEleccion) || undefined;

    this._electionsService
      .list(this._query)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.elecciones = res.data;
          this.total = res.total;
        },
        error: () => this._notifyError('No se pudieron cargar las elecciones.'),
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

  newEleccion(): void {
    this.selected = null;
    this.form.reset({
      nombre: '',
      descripcion: '',
      tipo: 'INSTITUCIONAL',
      vueltaActual: 1,
    });
  }

  select(eleccion: Eleccion): void {
    this._electionsService.get(eleccion.id).subscribe({
      next: (detalle) => {
        this.selected = detalle;
        this.form.reset({
          nombre: detalle.nombre,
          descripcion: detalle.descripcion ?? '',
          tipo: detalle.tipo,
          vueltaActual: detalle.vueltaActual,
        });
      },
      error: () => this._notifyError('No se pudo cargar la elección.'),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre!,
      descripcion: raw.descripcion || null,
      tipo: raw.tipo!,
      ...(this.selected
        ? { vueltaActual: Number(raw.vueltaActual ?? 1) }
        : {}),
    };

    const isEdit = !!this.selected;
    this.saving = true;
    const request$ = this.selected
      ? this._electionsService.update(this.selected.id, payload)
      : this._electionsService.create(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (detalle) => {
        this.selected = detalle;
        this._notify(isEdit ? 'Elección guardada.' : 'Elección creada.');
        this.load();
      },
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo guardar.')),
    });
  }

  nextStates(eleccion: Eleccion): EstadoEleccion[] {
    return ESTADO_TRANSICIONES[eleccion.estado] ?? [];
  }

  /** Texto del ítem de menú por estado destino (más claro que "Pasar a X"). */
  transitionLabel(estado: EstadoEleccion): string {
    const custom: Partial<Record<EstadoEleccion, string>> = {
      RESULTADOS_DEFINITIVOS: 'Publicar resultados definitivos',
      POSESIONADA: 'Registrar posesión de autoridades',
      ANULADA: 'Anular la elección',
    };
    return custom[estado] ?? `Pasar a ${this.label(estado)}`;
  }

  cambiarEstado(eleccion: Eleccion, estado: EstadoEleccion): void {
    const mensajes: Partial<Record<EstadoEleccion, string>> = {
      RESULTADOS_DEFINITIVOS: `Se publicarán los resultados como DEFINITIVOS: pasarán a mostrarse en el sitio público (página de Resultados) y la elección quedará lista para "Posesionada". Hazlo cuando ya socializaste los resultados provisionales.`,
      POSESIONADA: `La elección pasará de ${this.label(eleccion.estado)} a Posesionada (Art. 22). Esto es definitivo: se publicará en el sitio público el acta de posesión con las autoridades electas de cada dignidad.`,
      ANULADA: `La elección pasará de ${this.label(eleccion.estado)} a Anulada. Es un estado final: el proceso deja de estar activo.`,
    };
    const message =
      mensajes[estado] ??
      `La elección pasará de ${this.label(eleccion.estado)} a ${this.label(estado)}.`;
    this._institutionalDialog
      .prompt({
        title: 'Cambiar etapa de la elección',
        message,
        inputLabel: 'Comentario del cambio',
        confirmText: 'Cambiar etapa',
        icon: 'lucide:refresh-ccw-dot',
      })
      .subscribe((comentario) => {
        if (comentario === null) return;
        this._electionsService
          .cambiarEstado(eleccion.id, { estado, comentario: comentario || null })
          .subscribe({
            next: (detalle) => {
              if (this.selected?.id === detalle.id) this.selected = detalle;
              this._notify(`Estado actualizado a ${this.label(detalle.estado)}.`);
              this.load();
            },
            error: (err) =>
              this._notifyError(
                this.errorMessage(err, 'No se pudo cambiar el estado.'),
              ),
          });
      });
  }

  togglePortalPublico(eleccion: Eleccion): void {
    const activar = !eleccion.portalPublico;
    this._institutionalDialog
      .confirm({
        title: activar
          ? 'Mostrar en el portal público'
          : 'Quitar del portal público',
        message: activar
          ? `"${eleccion.nombre}" pasará a ser el proceso que ven los electores en el portal público (nombre, cronograma, candidatos, participación y resultados). El proceso que estuviera visible se ocultará.`
          : 'El portal público quedará sin proceso activo: los electores verán un aviso de que no hay una elección en curso.',
        confirmText: activar ? 'Mostrar en el portal' : 'Quitar del portal',
        danger: !activar,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this._electionsService
          .setPortalPublico(eleccion.id, activar)
          .subscribe({
            next: (detalle) => {
              if (this.selected?.id === detalle.id) this.selected = detalle;
              this._notify(
                activar
                  ? 'Portal público actualizado.'
                  : 'El portal público quedó sin proceso activo.',
              );
              this.load();
            },
            error: (err) =>
              this._notifyError(
                this.errorMessage(err, 'No se pudo actualizar el portal público.'),
              ),
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

  estadoClass(estado: EstadoEleccion): string {
    const base = 'inline-flex rounded px-2 py-1 text-xs font-semibold';
    if (estado === 'ANULADA') return `${base} bg-red-100 text-red-700`;
    if (estado === 'POSESIONADA') return `${base} bg-green-100 text-green-700`;
    if (estado.includes('VOTACION')) {
      return `${base} bg-blue-100 text-blue-700`;
    }
    if (estado.includes('RESULTADOS')) {
      return `${base} bg-amber-100 text-amber-700`;
    }
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
