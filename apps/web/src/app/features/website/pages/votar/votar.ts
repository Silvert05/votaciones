import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  DignidadVotante,
  LandingEleccion,
  TarjetonVotante,
  VenpService,
  VotoSeleccion,
} from '../../services/venp.service';

type Fase = 'seleccion' | 'login' | 'cedula' | 'confirmar' | 'listo';
type SeleccionValue = 'BLANCO' | 'NULO' | `CANDIDATO:${string}`;

@Component({
  selector: 'app-votar',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './votar.html',
})
export default class VotarComponent implements OnInit, OnDestroy {
  private _venp = inject(VenpService);
  private _snack = inject(MatSnackBar);
  private _route = inject(ActivatedRoute);
  private _cdr = inject(ChangeDetectorRef);

  fase: Fase = 'seleccion';
  loading = false;
  working = false;

  elecciones: LandingEleccion[] = [];
  eleccion: LandingEleccion | null = null;

  identificacionCtrl = new FormControl('', [Validators.required]);
  passwordCtrl = new FormControl('', [Validators.required]);
  verPassword = false;

  tarjeton: TarjetonVotante | null = null;
  selecciones: Record<string, SeleccionValue> = {};
  cedulaIndex = 0;

  countdown = '';
  private _timer: any = null;

  redirectSegundos = 90;
  private _redirectTimer: any = null;

  ngOnInit(): void {
    this.loadElecciones();
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
    if (this._redirectTimer) clearInterval(this._redirectTimer);
  }

  loadElecciones(): void {
    this.loading = true;
    this._venp
      .listElecciones()
      .pipe(
        finalize(() => {
          this.loading = false;
          this._cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (data) => {
          this.elecciones = data.filter((e) => e.votarDisponible);
          const preId = this._route.snapshot.queryParamMap.get('eleccion');
          const pre = preId && this.elecciones.find((e) => e.id === preId);
          if (pre) this.elegir(pre);
          else if (this.elecciones.length === 1) this.elegir(this.elecciones[0]);
        },
        error: () => this._notify('No se pudieron cargar las elecciones.'),
      });
  }

  elegir(e: LandingEleccion): void {
    this.eleccion = e;
    this.fase = 'login';
    this.setupCountdown();
  }

  ingresar(): void {
    if (!this.eleccion) return;
    if (this.identificacionCtrl.invalid || this.passwordCtrl.invalid) {
      this.identificacionCtrl.markAsTouched();
      this.passwordCtrl.markAsTouched();
      return;
    }
    this.working = true;
    this._venp
      .login(
        this.eleccion.id,
        this.identificacionCtrl.value!.trim(),
        this.passwordCtrl.value!,
      )
      .pipe(
        finalize(() => {
          this.working = false;
          this._cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => this.cargarTarjeton(),
        error: (err) =>
          this._notify(this._msg(err, 'No se pudo ingresar. Verifique sus credenciales.')),
      });
  }

  cargarTarjeton(): void {
    this.working = true;
    this._venp
      .tarjeton()
      .pipe(
        finalize(() => {
          this.working = false;
          this._cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (t) => {
          this.tarjeton = t;
          this.selecciones = {};
          for (const d of t.dignidades) this.selecciones[d.id] = 'BLANCO';
          this.cedulaIndex = 0;
          this.fase = 'cedula';
        },
        error: (err) =>
          this._notify(this._msg(err, 'No se pudo cargar la cedula.')),
      });
  }

  get cedulaActual(): DignidadVotante | null {
    return this.tarjeton?.dignidades[this.cedulaIndex] ?? null;
  }

  get totalCedulas(): number {
    return this.tarjeton?.dignidades.length ?? 0;
  }

  seleccion(dignidadId: string): SeleccionValue {
    return this.selecciones[dignidadId] ?? 'BLANCO';
  }

  marcar(dignidadId: string, value: SeleccionValue): void {
    this.selecciones[dignidadId] = value;
  }

  siguiente(): void {
    if (this.cedulaIndex < this.totalCedulas - 1) this.cedulaIndex++;
    else this.fase = 'confirmar';
  }

  anterior(): void {
    if (this.cedulaIndex > 0) this.cedulaIndex--;
  }

  resumen(): Array<{ dignidad: string; opcion: string }> {
    if (!this.tarjeton) return [];
    return this.tarjeton.dignidades.map((d) => {
      const val = this.seleccion(d.id);
      let opcion = 'Voto en blanco';
      if (val === 'NULO') opcion = 'Voto nulo';
      else if (val.startsWith('CANDIDATO:')) {
        const id = val.replace('CANDIDATO:', '');
        const cand = d.candidaturas.find((c) => c.id === id);
        opcion = cand
          ? `${cand.elector.apellidos} ${cand.elector.nombres}`
          : 'Candidato';
      }
      return { dignidad: d.nombre, opcion };
    });
  }

  confirmar(): void {
    if (!this.tarjeton) return;
    const votos: VotoSeleccion[] = this.tarjeton.dignidades.map((d) => {
      const val = this.seleccion(d.id);
      if (val.startsWith('CANDIDATO:')) {
        return {
          dignidadId: d.id,
          tipo: 'CANDIDATO',
          candidaturaId: val.replace('CANDIDATO:', ''),
        };
      }
      return { dignidadId: d.id, tipo: val as 'BLANCO' | 'NULO', candidaturaId: null };
    });

    this.working = true;
    this._venp
      .emitir(votos)
      .pipe(
        finalize(() => {
          this.working = false;
          this._cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this._venp.logout();
          this.fase = 'listo';
          if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
          }
          this._iniciarRedireccion();
        },
        error: (err) =>
          this._notify(this._msg(err, 'No se pudo registrar el voto.')),
      });
  }

  /** Tras confirmar el voto vuelve al login (kiosco) pasado ~1.5 min. */
  private _iniciarRedireccion(): void {
    if (this._redirectTimer) clearInterval(this._redirectTimer);
    this.redirectSegundos = 90;
    this._redirectTimer = setInterval(() => {
      this.redirectSegundos--;
      if (this.redirectSegundos <= 0) {
        this.volverALogin();
        return;
      }
      this._cdr.detectChanges();
    }, 1000);
  }

  volverALogin(): void {
    if (this._redirectTimer) {
      clearInterval(this._redirectTimer);
      this._redirectTimer = null;
    }
    this.identificacionCtrl.reset('');
    this.passwordCtrl.reset('');
    this.verPassword = false;
    this.tarjeton = null;
    this.selecciones = {};
    this.cedulaIndex = 0;
    this.fase = 'login';
    this.setupCountdown();
    this._cdr.detectChanges();
  }

  candidatoLabel(c: DignidadVotante['candidaturas'][number]): string {
    const lista = c.lista ? ` · ${c.lista.codigo} ${c.lista.nombre}` : '';
    return `${c.elector.apellidos} ${c.elector.nombres}${lista}`;
  }

  private setupCountdown(): void {
    if (this._timer) clearInterval(this._timer);
    const tick = () => {
      const fin = this.eleccion?.fechaFinVotacion;
      if (!fin) {
        this.countdown = '';
        return;
      }
      const diff = new Date(fin).getTime() - Date.now();
      if (diff <= 0) {
        this.countdown = '00:00:00';
        this._cdr.detectChanges();
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      this.countdown = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
      this._cdr.detectChanges();
    };
    tick();
    this._timer = setInterval(tick, 1000);
  }

  private _notify(message: string): void {
    this._snack.open(message, 'Cerrar', { duration: 4000 });
  }

  private _msg(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
