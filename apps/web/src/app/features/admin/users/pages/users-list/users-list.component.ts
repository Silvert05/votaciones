import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
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
import { Rol } from '../../../auth/models/auth.model';
import { Perfil } from '../../../security/models/security.model';
import { SecurityService } from '../../../security/services/security.service';
import { ResetPasswordDialog } from '../../dialogs/reset-password/reset-password.dialog';
import {
  UserFormData,
  UserFormDialog,
} from '../../dialogs/user-form/user-form.dialog';
import { User, UsersQuery } from '../../models/user.model';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'admin-users-list',
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
  templateUrl: './users-list.component.html',
})
export default class UsersListComponent implements OnInit {
  private _usersService = inject(UsersService);
  private _securityService = inject(SecurityService);
  private _dialog = inject(MatDialog);
  private _snackBar = inject(MatSnackBar);
  private _institutionalDialog = inject(InstitutionalDialogService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = [
    'usuario',
    'nombre',
    'email',
    'rol',
    'perfil',
    'estado',
    'acciones',
  ];

  users: User[] = [];
  perfiles: Perfil[] = [];
  total = 0;
  loading = false;

  searchCtrl = new FormControl('');
  rolCtrl = new FormControl<Rol | ''>('');
  perfilCtrl = new FormControl<string>('');
  activoCtrl = new FormControl<'' | 'true' | 'false'>('');

  private _query: UsersQuery = { page: 1, limit: 10 };

  ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this._query.page = 1;
        this.load();
      });
    this._securityService.listPerfiles().subscribe({
      next: (perfiles) => {
        this.perfiles = perfiles;
      },
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this._query.search = this.searchCtrl.value || undefined;
    this._query.rol = (this.rolCtrl.value as Rol) || undefined;
    this._query.perfilId = this.perfilCtrl.value || undefined;
    this._query.activo =
      this.activoCtrl.value === '' ? undefined : this.activoCtrl.value === 'true';

    this._usersService
      .list(this._query)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
      next: (res) => {
        this.users = res.data;
        this.total = res.total;
      },
      error: () => {
        this._notify('No se pudieron cargar los usuarios.');
      },
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

  create(): void {
    this._openForm({ mode: 'create' });
  }

  edit(user: User): void {
    this._openForm({ mode: 'edit', user });
  }

  resetPassword(user: User): void {
    this._dialog
      .open(ResetPasswordDialog, { data: user, width: '420px' })
      .afterClosed()
      .subscribe((result?: User) => {
        if (result) {
          this._notify(`Contraseña de ${result.usuario} reseteada.`);
        }
      });
  }

  toggleActivo(user: User): void {
    const accion = user.activo ? 'desactivar' : 'activar';
    this._institutionalDialog.confirm({
      title: `${user.activo ? 'Desactivar' : 'Activar'} usuario`,
      message: `Se va a ${accion} la cuenta “${user.usuario}”.`,
      confirmText: user.activo ? 'Desactivar' : 'Activar',
      danger: user.activo,
      icon: 'heroicons_outline:user-circle',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this._usersService.setActivo(user.id, !user.activo).subscribe({
        next: (updated) => {
          user.activo = updated.activo;
          this._notify(`Usuario ${updated.activo ? 'activado' : 'desactivado'}.`);
        },
        error: (err) => {
          const message = err?.error?.message || 'No se pudo cambiar el estado.';
          this._notify(Array.isArray(message) ? message.join(' ') : message);
        },
      });
    });
  }

  private _openForm(data: UserFormData): void {
    this._dialog
      .open(UserFormDialog, { data, width: '480px' })
      .afterClosed()
      .subscribe((result?: User) => {
        if (result) {
          this._notify(
            data.mode === 'create'
              ? `Usuario "${result.usuario}" creado.`
              : `Usuario "${result.usuario}" actualizado.`,
          );
          this.load();
        }
      });
  }

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
