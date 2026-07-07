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
import { TIPOS_ELECTOR, TipoElector } from '../../../elections/models/election.model';
import { Elector, ElectoresQuery } from '../../models/padron.model';
import { PadronService } from '../../services/padron.service';

@Component({
  selector: 'admin-electores-list',
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
  templateUrl: './electores-list.component.html',
})
export default class ElectoresListComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _padronService = inject(PadronService);
  private _snackBar = inject(MatSnackBar);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = ['identificacion', 'nombre', 'tipo', 'unidad', 'estado', 'acciones'];
  readonly tipos = TIPOS_ELECTOR;

  electores: Elector[] = [];
  selected: Elector | null = null;
  total = 0;
  loading = false;
  saving = false;

  searchCtrl = new FormControl('');
  tipoCtrl = new FormControl<TipoElector | ''>('');
  activoCtrl = new FormControl<'' | 'true' | 'false'>('');

  form = this._fb.group({
    identificacion: ['', [Validators.required, Validators.maxLength(20)]],
    nombres: ['', [Validators.required, Validators.maxLength(120)]],
    apellidos: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.email, Validators.maxLength(180)]],
    tipo: ['ESTUDIANTE' as TipoElector, Validators.required],
    facultad: ['', Validators.maxLength(160)],
    carrera: ['', Validators.maxLength(160)],
    curso: ['', Validators.maxLength(80)],
  });

  private _query: ElectoresQuery = { page: 1, limit: 10 };

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
    this._query.tipo = (this.tipoCtrl.value as TipoElector) || undefined;
    this._query.activo =
      this.activoCtrl.value === '' ? undefined : this.activoCtrl.value === 'true';

    this._padronService
      .listElectores(this._query)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.electores = res.data;
          this.total = res.total;
        },
        error: () => this._notify('No se pudieron cargar los electores.'),
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

  newElector(): void {
    this.selected = null;
    this.form.reset({
      identificacion: '',
      nombres: '',
      apellidos: '',
      email: '',
      tipo: 'ESTUDIANTE',
      facultad: '',
      carrera: '',
      curso: '',
    });
  }

  select(elector: Elector): void {
    this.selected = elector;
    this.form.reset({
      identificacion: elector.identificacion,
      nombres: elector.nombres,
      apellidos: elector.apellidos,
      email: elector.email ?? '',
      tipo: elector.tipo,
      facultad: elector.facultad ?? '',
      carrera: elector.carrera ?? '',
      curso: elector.curso ?? '',
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      identificacion: raw.identificacion!,
      nombres: raw.nombres!,
      apellidos: raw.apellidos!,
      email: raw.email || null,
      tipo: raw.tipo!,
      facultad: raw.facultad || null,
      carrera: raw.carrera || null,
      curso: raw.curso || null,
    };

    const isEdit = !!this.selected;
    this.saving = true;
    const request$ = this.selected
      ? this._padronService.updateElector(this.selected.id, payload)
      : this._padronService.createElector(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (elector) => {
        this.selected = elector;
        this._notify(isEdit ? 'Elector actualizado.' : 'Elector creado.');
        this.load();
      },
      error: (err) => this._notify(this.errorMessage(err, 'No se pudo guardar.')),
    });
  }

  toggleActivo(elector: Elector): void {
    this._padronService.setElectorActivo(elector.id, !elector.activo).subscribe({
      next: () => {
        this._notify(`Elector ${elector.activo ? 'desactivado' : 'activado'}.`);
        this.load();
      },
      error: (err) =>
        this._notify(this.errorMessage(err, 'No se pudo cambiar el estado.')),
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

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}