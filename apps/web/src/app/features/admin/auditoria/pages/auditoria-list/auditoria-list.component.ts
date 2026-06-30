import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { AuditLog, AuditoriaQuery } from '../../models/auditoria.model';
import { AuditoriaService } from '../../services/auditoria.service';

@Component({
  selector: 'admin-auditoria-list',
  imports: [
    DatePipe,
    JsonPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './auditoria-list.component.html',
  styles: [
    `
      tr.detail-row {
        height: 0;
      }
      tr.detail-row td {
        padding: 0 !important;
        border-bottom-width: 0;
      }
    `,
  ],
})
export default class AuditoriaListComponent implements OnInit {
  private _auditoriaService = inject(AuditoriaService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = [
    'createdAt',
    'usuario',
    'tabla',
    'operacion',
    'ip',
    'expand',
  ];

  readonly operaciones = [
    { value: 'CREATE', label: 'Creación' },
    { value: 'UPDATE', label: 'Edición' },
    { value: 'ESTADO', label: 'Cambio de estado' },
    { value: 'RESET', label: 'Reseteo de clave' },
    { value: 'LOGIN', label: 'Inicio de sesión' },
    { value: 'LOGOUT', label: 'Cierre de sesión' },
    { value: 'PASSWORD', label: 'Cambio de clave' },
  ];

  logs: AuditLog[] = [];
  total = 0;
  loading = false;
  expandedId: number | null = null;

  tablaCtrl = new FormControl<string>('');
  operacionCtrl = new FormControl<string>('');
  usuarioCtrl = new FormControl<string>('');
  desdeCtrl = new FormControl<Date | null>(null);
  hastaCtrl = new FormControl<Date | null>(null);

  private _query: AuditoriaQuery = { page: 1, limit: 20 };

  ngOnInit(): void {
    this.usuarioCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this._query.page = 1;
        this.load();
      });
    this.load();
  }

  load(): void {
    this.loading = true;
    this._query.tabla = this.tablaCtrl.value || undefined;
    this._query.operacion = this.operacionCtrl.value || undefined;
    this._query.usuario = this.usuarioCtrl.value || undefined;
    this._query.desde = this.desdeCtrl.value
      ? this.desdeCtrl.value.toISOString()
      : undefined;
    this._query.hasta = this.hastaCtrl.value
      ? this._endOfDay(this.hastaCtrl.value).toISOString()
      : undefined;

    this._auditoriaService
      .list(this._query)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
      next: (res) => {
        this.logs = res.data;
        this.total = res.total;
      },
      error: () => {},
    });
  }

  onFilterChange(): void {
    this._query.page = 1;
    this.load();
  }

  clearFilters(): void {
    this.tablaCtrl.setValue('');
    this.operacionCtrl.setValue('');
    this.usuarioCtrl.setValue('', { emitEvent: false });
    this.desdeCtrl.setValue(null);
    this.hastaCtrl.setValue(null);
    this._query.page = 1;
    this.load();
  }

  onPage(e: PageEvent): void {
    this._query.page = e.pageIndex + 1;
    this._query.limit = e.pageSize;
    this.load();
  }

  toggle(log: AuditLog): void {
    this.expandedId = this.expandedId === log.id ? null : log.id;
  }

  get pageIndex(): number {
    return (this._query.page ?? 1) - 1;
  }

  get pageSize(): number {
    return this._query.limit ?? 20;
  }

  operacionLabel(op: string): string {
    return this.operaciones.find((o) => o.value === op)?.label ?? op;
  }

  operacionClass(op: string): string {
    switch (op) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'ESTADO':
        return 'bg-amber-100 text-amber-800';
      case 'RESET':
      case 'PASSWORD':
        return 'bg-purple-100 text-purple-800';
      case 'LOGIN':
        return 'bg-teal-100 text-teal-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  private _endOfDay(d: Date): Date {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}
