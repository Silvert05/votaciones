import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
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
import { Dignidad, Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import { PadronElectoralItem } from '../../../padron/models/padron.model';
import { PadronService } from '../../../padron/services/padron.service';
import {
  Candidatura,
  CandidaturasQuery,
  ESTADOS_CANDIDATURA,
  EstadoCandidatura,
  ListaElectoral,
} from '../../models/candidatura.model';
import { CandidaturasService } from '../../services/candidaturas.service';
import { CalificacionChecklistDialog } from '../../dialogs/calificacion-checklist/calificacion-checklist.dialog';

@Component({
  selector: 'admin-candidaturas',
  imports: [
    ReactiveFormsModule,
    DatePipe,
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
  templateUrl: './candidaturas.component.html',
})
export default class CandidaturasComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _padronService = inject(PadronService);
  private _candidaturasService = inject(CandidaturasService);
  private _notifyService = inject(NotifyService);
  private _institutionalDialog = inject(InstitutionalDialogService);
  private _dialog = inject(MatDialog);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = ['dignidad', 'candidato', 'lista', 'estado', 'acciones'];
  readonly estados = ESTADOS_CANDIDATURA;

  elecciones: Eleccion[] = [];
  dignidades: Dignidad[] = [];
  padronHabilitado: PadronElectoralItem[] = [];
  listas: ListaElectoral[] = [];
  candidaturas: Candidatura[] = [];
  selected: Candidatura | null = null;
  total = 0;
  loading = false;
  saving = false;

  selectedEleccionCtrl = new FormControl<string>('');
  searchCtrl = new FormControl('');
  estadoCtrl = new FormControl<EstadoCandidatura | ''>('');
  dignidadFilterCtrl = new FormControl<string>('');
  listaFilterCtrl = new FormControl<string>('');

  form = this._fb.group({
    dignidadId: ['', Validators.required],
    electorId: ['', Validators.required],
    listaId: [''],
    orden: [0, [Validators.required, Validators.min(0), Validators.max(9999)]],
  });

  private _query: CandidaturasQuery = { page: 1, limit: 10 };

  ngOnInit(): void {
    this.loadElecciones();
    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this._query.page = 1;
        this.load();
      });
    this.selectedEleccionCtrl.valueChanges.subscribe((id) => {
      this._query.page = 1;
      this.newCandidatura();
      this.loadSetup(id || '');
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

  loadSetup(eleccionId: string): void {
    if (!eleccionId) {
      this.dignidades = [];
      this.padronHabilitado = [];
      this.listas = [];
      return;
    }

    this._electionsService.get(eleccionId).subscribe({
      next: (detalle) => {
        this.dignidades = detalle.dignidades.filter((d) => d.activo);
      },
      error: () => this._notifyError('No se pudieron cargar las dignidades.'),
    });

    this._padronService
      .listPadron(eleccionId, { page: 1, limit: 100, estado: 'HABILITADO' })
      .subscribe({
        next: (res) => {
          this.padronHabilitado = res.data.filter((item) => item.publicado);
        },
        error: () => this._notifyError('No se pudo cargar el padrón habilitado.'),
      });

    this._candidaturasService
      .listListas(eleccionId, { page: 1, limit: 100 })
      .subscribe({
        next: (res) => {
          this.listas = res.data.filter(
            (lista) => lista.estado !== 'RECHAZADA' && lista.estado !== 'RETIRADA',
          );
        },
        error: () => this._notifyError('No se pudieron cargar las listas.'),
      });
  }

  load(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this.candidaturas = [];
      this.total = 0;
      return;
    }
    this.loading = true;
    this._query.search = this.searchCtrl.value || undefined;
    this._query.estado = (this.estadoCtrl.value as EstadoCandidatura) || undefined;
    this._query.dignidadId = this.dignidadFilterCtrl.value || undefined;
    this._query.listaId = this.listaFilterCtrl.value || undefined;

    this._candidaturasService
      .listCandidaturas(eleccionId, this._query)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.candidaturas = res.data;
          this.total = res.total;
        },
        error: () => this._notifyError('No se pudieron cargar las candidaturas.'),
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
        this._notify('Inscripción de candidaturas abierta.');
        this.loadElecciones();
      },
      error: (err) => this._notifyError(this.errorMessage(err, 'No se pudo abrir candidaturas.')),
    });
  }

  cerrarCalificacion(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._institutionalDialog.confirm({
      title: 'Cerrar calificación',
      message: 'Las candidaturas inscritas pasarán a la etapa de candidaturas calificadas.',
      confirmText: 'Cerrar calificación',
      icon: 'lucide:badge-check',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this._candidaturasService.cerrarCalificacion(eleccionId).subscribe({
        next: () => {
          this._notify('Calificación de candidaturas cerrada.');
          this.loadElecciones();
        },
        error: (err) => this._notifyError(this.errorMessage(err, 'No se pudo cerrar la calificación.')),
      });
    });
  }

  newCandidatura(): void {
    this.selected = null;
    this.form.reset({ dignidadId: '', electorId: '', listaId: '', orden: 0 });
  }

  edit(candidatura: Candidatura): void {
    this.selected = candidatura;
    this.form.reset({
      dignidadId: candidatura.dignidadId,
      electorId: candidatura.electorId,
      listaId: candidatura.listaId ?? '',
      orden: candidatura.orden,
    });
  }

  save(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this._notify('Selecciona una elección.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    const request$ = this.selected
      ? this._candidaturasService.updateCandidatura(eleccionId, this.selected.id, {
          listaId: raw.listaId || null,
          orden: Number(raw.orden ?? 0),
        })
      : this._candidaturasService.createCandidatura(eleccionId, {
          dignidadId: raw.dignidadId!,
          electorId: raw.electorId!,
          listaId: raw.listaId || null,
          orden: Number(raw.orden ?? 0),
        });

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (candidatura) => {
        this.selected = candidatura;
        this._notify(this.selected ? 'Candidatura guardada.' : 'Candidatura creada.');
        this.load();
      },
      error: (err) => this._notifyError(this.errorMessage(err, 'No se pudo guardar.')),
    });
  }

  calificar(candidatura: Candidatura, estado: EstadoCandidatura): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;

    if (estado === 'CALIFICADA') {
      this._dialog
        .open(CalificacionChecklistDialog, {
          width: 'min(92vw, 560px)',
          maxWidth: '92vw',
          data: { candidatura },
        })
        .afterClosed()
        .subscribe((result) => {
          if (!result) return;
          this._candidaturasService
            .calificar(eleccionId, candidatura.id, result)
            .subscribe({
              next: () => {
                this._notify(`Candidatura marcada como ${this.label(result.estado)}.`);
                this.load();
              },
              error: (err) =>
                this._notifyError(this.errorMessage(err, 'No se pudo calificar.')),
            });
        });
      return;
    }

    this._institutionalDialog.prompt({
      title: `${this.label(estado)} candidatura`,
      message: 'Registre la observación correspondiente para la candidatura seleccionada.',
      inputLabel: 'Observación de calificación',
      initialValue: candidatura.observacion ?? '',
      confirmText: 'Guardar calificación',
      icon: 'lucide:clipboard-check',
    }).subscribe((observacion) => {
      if (observacion === null) return;
      this._candidaturasService
        .calificar(eleccionId, candidatura.id, { estado, observacion: observacion || null })
        .subscribe({
          next: () => {
            this._notify(`Candidatura marcada como ${this.label(estado)}.`);
            this.load();
          },
          error: (err) => this._notifyError(this.errorMessage(err, 'No se pudo calificar.')),
        });
    });
  }

  subsanar(candidatura: Candidatura): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._institutionalDialog.prompt({
      title: 'Subsanar candidatura observada',
      message: 'Registre la documentación corregida presentada dentro del plazo de 24 horas (Art. 13).',
      inputLabel: 'Notas de subsanación',
      confirmText: 'Registrar subsanación',
      icon: 'lucide:file-up',
    }).subscribe((observacion) => {
      if (observacion === null) return;
      this._candidaturasService
        .subsanar(eleccionId, candidatura.id, { observacion: observacion || null })
        .subscribe({
          next: () => {
            this._notify('Candidatura subsanada, vuelve a quedar inscrita para revisión.');
            this.load();
          },
          error: (err) =>
            this._notifyError(this.errorMessage(err, 'No se pudo registrar la subsanación.')),
        });
    });
  }

  impugnarCalificacion(candidatura: Candidatura): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._institutionalDialog
      .prompt({
        title: 'Impugnar calificación',
        message:
          'Indique quién presenta la impugnación y el correo de notificación en el formato "Nombre <correo@dominio>". La resolución del Consejo Electoral es de última instancia (Art. 14).',
        inputLabel: 'Presentado por <correo>',
        confirmText: 'Registrar impugnación',
        icon: 'lucide:scale',
      })
      .subscribe((entrada) => {
        if (!entrada) return;
        const match = entrada.match(/^(.*)<(.+)>$/);
        const presentadoPor = (match?.[1] ?? entrada).trim() || 'Sin especificar';
        const correoNotificacion = (match?.[2] ?? '').trim();
        if (!correoNotificacion) {
          this._notifyError('Formato esperado: "Nombre <correo@dominio>".');
          return;
        }
        this._candidaturasService
          .impugnarCalificacion(eleccionId, candidatura.id, {
            presentadoPor,
            correoNotificacion,
            fundamento: 'Impugnación a la calificación registrada desde el panel administrativo.',
          })
          .subscribe({
            next: () => {
              this._notify('Impugnación a la calificación registrada.');
              this.load();
            },
            error: (err) =>
              this._notifyError(this.errorMessage(err, 'No se pudo registrar la impugnación.')),
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

  estadoClass(estado: EstadoCandidatura): string {
    const base = 'inline-flex rounded px-2 py-1 text-xs font-semibold';
    if (estado === 'CALIFICADA') return `${base} bg-green-100 text-green-700`;
    if (estado === 'RECHAZADA' || estado === 'RETIRADA') return `${base} bg-red-100 text-red-700`;
    if (estado === 'OBSERVADA') return `${base} bg-amber-100 text-amber-800`;
    return `${base} bg-blue-100 text-blue-700`;
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
