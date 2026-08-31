import { Component, Inject, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FuseAlertComponent, FuseAlertType } from '@core/components/alert';
import { Perfil } from 'app/features/admin/security/models/security.model';
import { SecurityService } from 'app/features/admin/security/services/security.service';
import { Elector } from 'app/features/admin/padron/models/padron.model';
import { PadronService } from 'app/features/admin/padron/services/padron.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';

export interface UserFormData {
  mode: 'create' | 'edit';
  user?: User;
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    FuseAlertComponent,
  ],
  templateUrl: './user-form.dialog.html',
})
export class UserFormDialog implements OnInit {
  form: FormGroup;
  saving = false;
  showPassword = false;
  perfiles: Perfil[] = [];
  alert: { show: boolean; type: FuseAlertType; message: string } = {
    show: false,
    type: 'error',
    message: '',
  };

  /** Origen del usuario nuevo: a partir de un elector (por defecto) o manual. */
  modo: 'elector' | 'manual' = 'elector';
  electorSearchCtrl = new FormControl('');
  electorResultados: Elector[] = [];
  electorSeleccionado: Elector | null = null;
  buscandoElectores = false;

  private _fb = inject(FormBuilder);
  private _usersService = inject(UsersService);
  private _securityService = inject(SecurityService);
  private _padronService = inject(PadronService);
  private _dialogRef = inject(MatDialogRef<UserFormDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: UserFormData) {}

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  ngOnInit(): void {
    const u = this.data.user;
    this.form = this._fb.group({
      usuario: [
        { value: u?.usuario ?? '', disabled: this.isEdit },
        [Validators.required],
      ],
      nombre: [u?.nombre ?? '', [Validators.required]],
      email: [u?.email ?? '', [Validators.required, Validators.email]],
      rol: [u?.rol ?? 'USER', [Validators.required]],
      perfilId: [u?.perfilId ?? null],
      encargadoCronograma: [u?.encargadoCronograma ?? false],
      password: [
        '',
        this.isEdit ? [] : [Validators.required, Validators.minLength(6)],
      ],
    });

    this._securityService.listPerfiles().subscribe({
      next: (perfiles) => {
        this.perfiles = perfiles.filter((perfil) => perfil.activo);
      },
    });

    if (!this.isEdit) {
      this._actualizarEstadoControles();

      this.electorSearchCtrl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((termino) => {
            const search = (termino ?? '').trim();
            if (search.length < 2) {
              this.buscandoElectores = false;
              return [];
            }
            this.buscandoElectores = true;
            return this._padronService.listElectores({
              search,
              limit: 8,
              activo: true,
            });
          }),
        )
        .subscribe({
          next: (res) => {
            this.buscandoElectores = false;
            this.electorResultados = res?.data ?? [];
          },
          error: () => {
            this.buscandoElectores = false;
            this.electorResultados = [];
          },
        });

      this.form.get('usuario')?.valueChanges.subscribe((value) => {
        if (this.electorSeleccionado) {
          this.form.get('password')?.setValue(value, { emitEvent: false });
        }
      });
    }
  }

  setModo(modo: 'elector' | 'manual'): void {
    if (this.modo === modo) {
      return;
    }
    this.modo = modo;
    this.quitarElector();
  }

  seleccionarElector(elector: Elector): void {
    this.electorSeleccionado = elector;
    this.electorResultados = [];
    this.electorSearchCtrl.setValue('', { emitEvent: false });

    const usuarioGenerado = this._generarUsuario(
      elector.apellidos,
      elector.nombres,
    );
    this.form.patchValue({
      nombre: `${elector.nombres} ${elector.apellidos}`,
      email: elector.email ?? '',
      usuario: usuarioGenerado,
      password: usuarioGenerado,
    });
    this._actualizarEstadoControles();
  }

  quitarElector(): void {
    this.electorSeleccionado = null;
    this.electorResultados = [];
    this.electorSearchCtrl.setValue('', { emitEvent: false });
    if (this.modo === 'manual') {
      this.form.patchValue({ nombre: '', usuario: '', password: '' });
    }
    this._actualizarEstadoControles();
  }

  save(): void {
    if (
      !this.isEdit &&
      this.modo === 'elector' &&
      !this.electorSeleccionado
    ) {
      this.alert = {
        show: true,
        type: 'error',
        message: 'Selecciona un estudiante o profesor.',
      };
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.alert.show = false;
    const v = this.form.getRawValue();

    const request$ = this.isEdit
      ? this._usersService.update(this.data.user!.id, {
          nombre: v.nombre,
          email: v.email,
          rol: v.rol,
          perfilId: v.perfilId || null,
          encargadoCronograma: v.encargadoCronograma,
        })
      : this._usersService.create({
          usuario: v.usuario,
          nombre: v.nombre,
          email: v.email,
          password: v.password,
          rol: v.rol,
          perfilId: v.perfilId || null,
          electorId:
            this.modo === 'elector' ? this.electorSeleccionado?.id : null,
          encargadoCronograma: v.encargadoCronograma,
        });

    request$.subscribe({
      next: (user) => this._dialogRef.close(user),
      error: (err) => {
        this.saving = false;
        const message =
          err?.error?.message || err?.message || 'No se pudo guardar.';
        this.alert = {
          show: true,
          type: 'error',
          message: Array.isArray(message) ? message.join(' ') : message,
        };
      },
    });
  }

  cancel(): void {
    this._dialogRef.close();
  }

  private _actualizarEstadoControles(): void {
    const derivadoDeElector = this.modo === 'elector';
    const nombreCtrl = this.form.get('nombre');
    const passwordCtrl = this.form.get('password');

    if (derivadoDeElector) {
      nombreCtrl?.disable();
      passwordCtrl?.disable();
    } else {
      nombreCtrl?.enable();
      passwordCtrl?.enable();
    }
  }

  private _normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }

  private _generarUsuario(apellidos: string, nombres: string): string {
    const primerApellido = this._normalizar(apellidos.split(' ')[0] ?? '');
    const primerNombre = this._normalizar(nombres.split(' ')[0] ?? '');
    return `${primerApellido.charAt(0)}${primerNombre}`;
  }
}
