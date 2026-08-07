import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NotifyService } from 'app/shared/services/notify.service';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { Opcion, Perfil, PerfilDetalle } from '../../models/security.model';
import { SecurityService } from '../../services/security.service';

@Component({
  selector: 'admin-perfiles-list',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatCheckboxModule,
  ],
  templateUrl: './perfiles-list.component.html',
})
export default class PerfilesListComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _securityService = inject(SecurityService);
  private _notifyService = inject(NotifyService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = ['nombre', 'descripcion', 'opciones', 'usuarios', 'estado', 'acciones'];

  perfiles: Perfil[] = [];
  opciones: Opcion[] = [];
  selectedPerfil: PerfilDetalle | null = null;
  selectedOpcionIds = new Set<string>();
  loading = false;
  saving = false;
  savingOptions = false;

  form = this._fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this._securityService.listOpciones().subscribe({
      next: (opciones) => {
        this.opciones = opciones;
      },
    });
    this._securityService
      .listPerfiles()
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (perfiles) => {
          this.perfiles = perfiles;
        },
        error: () => this._notifyError('No se pudieron cargar los perfiles.'),
      });
  }

  select(perfil: Perfil): void {
    this._securityService.getPerfil(perfil.id).subscribe({
      next: (detalle) => {
        this.selectedPerfil = detalle;
        this.selectedOpcionIds = new Set(detalle.opcionIds);
        this.form.patchValue({
          nombre: detalle.nombre,
          descripcion: detalle.descripcion ?? '',
        });
      },
      error: () => this._notifyError('No se pudo cargar el perfil.'),
    });
  }

  newPerfil(): void {
    this.selectedPerfil = null;
    this.selectedOpcionIds = new Set();
    this.form.reset({
      nombre: '',
      descripcion: '',
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
    };

    this.saving = true;
    const request$ = this.selectedPerfil
      ? this._securityService.updatePerfil(this.selectedPerfil.id, payload)
      : this._securityService.createPerfil(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (perfil) => {
        this._notify(this.selectedPerfil ? 'Perfil actualizado.' : 'Perfil creado.');
        this.load();
        this.select(perfil);
      },
      error: (err) => this._notifyError(this._errorMessage(err, 'No se pudo guardar.')),
    });
  }

  togglePerfil(perfil: Perfil): void {
    this._securityService.setPerfilActivo(perfil.id, !perfil.activo).subscribe({
      next: () => {
        this._notify(`Perfil ${perfil.activo ? 'desactivado' : 'activado'}.`);
        this.load();
      },
      error: (err) =>
        this._notifyError(this._errorMessage(err, 'No se pudo cambiar el estado.')),
    });
  }

  toggleOpcion(opcionId: string, checked: boolean): void {
    if (checked) {
      this.selectedOpcionIds.add(opcionId);
    } else {
      this.selectedOpcionIds.delete(opcionId);
    }
  }

  saveOpciones(): void {
    if (!this.selectedPerfil) {
      this._notify('Selecciona o crea un perfil primero.');
      return;
    }

    this.savingOptions = true;
    this._securityService
      .setPerfilOpciones(this.selectedPerfil.id, [...this.selectedOpcionIds])
      .pipe(finalize(() => (this.savingOptions = false)))
      .subscribe({
        next: (perfil) => {
          this.selectedPerfil = perfil;
          this.selectedOpcionIds = new Set(perfil.opcionIds);
          this._notify('Opciones asignadas al perfil.');
          this.load();
        },
        error: (err) =>
          this._notifyError(this._errorMessage(err, 'No se pudieron asignar opciones.')),
      });
  }

  isChecked(opcionId: string): boolean {
    return this.selectedOpcionIds.has(opcionId);
  }

  opcionesOrdenadas(): Opcion[] {
    return [...this.opciones].sort((a, b) => {
      const padreA = a.padre?.titulo ?? '';
      const padreB = b.padre?.titulo ?? '';
      return (
        padreA.localeCompare(padreB) ||
        a.orden - b.orden ||
        a.titulo.localeCompare(b.titulo)
      );
    });
  }

  private _notify(message: string): void {
    this._notifyService.success(message);
  }

  private _notifyError(message: string): void {
    this._notifyService.error(message);
  }

  private _errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
