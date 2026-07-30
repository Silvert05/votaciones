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
  ComprobanteVotacion,
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
  comprobante: ComprobanteVotacion | null = null;

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
        next: (res) => {
          this.comprobante = res.comprobante;
          this.descargarComprobante();
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
    this.comprobante = null;
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

  descargarComprobante(): void {
    const data = this.comprobante;
    if (!data) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const primary = '#075985';
    const secondary = '#0f766e';
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = primary;
    ctx.lineWidth = 18;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(58, 58, canvas.width - 116, canvas.height - 116);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(60, 60, 1120, 18);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(60, 78, 1120, 10);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(60, 88, 1120, 10);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 32px Arial';
    ctx.fillText('REPÚBLICA DEL ECUADOR', 620, 155);
    ctx.font = '600 27px Arial';
    ctx.fillText(
      (data.eleccion.institucion || 'INSTITUCIÓN ELECTORAL').toUpperCase(),
      620,
      205,
    );

    ctx.fillStyle = primary;
    ctx.fillRect(95, 260, 1050, 155);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 42px Arial';
    ctx.fillText('CERTIFICADO DE VOTACIÓN', 620, 330);
    ctx.font = '600 25px Arial';
    ctx.fillText('VOTO ELECTRÓNICO NO PRESENCIAL', 620, 375);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '600 23px Arial';
    ctx.fillText('PROCESO ELECTORAL', 120, 500);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 31px Arial';
    this._drawWrappedText(ctx, data.eleccion.nombre, 120, 545, 1000, 42);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(95, 660, 1050, 2);

    this._drawReceiptField(
      ctx,
      'APELLIDOS Y NOMBRES',
      `${data.elector.apellidos} ${data.elector.nombres}`,
      120,
      735,
    );
    this._drawReceiptField(
      ctx,
      'CÉDULA DE IDENTIDAD',
      data.elector.identificacion,
      120,
      890,
    );
    this._drawReceiptField(
      ctx,
      'FECHA Y HORA DE EMISIÓN',
      new Intl.DateTimeFormat('es-EC', {
        dateStyle: 'long',
        timeStyle: 'medium',
      }).format(new Date(data.emitidoAt)),
      120,
      1045,
    );

    const code = data.codigo.toUpperCase();
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(95, 1175, 1050, 250);
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 3;
    ctx.strokeRect(95, 1175, 1050, 250);
    ctx.textAlign = 'center';
    ctx.fillStyle = secondary;
    ctx.font = '700 22px Arial';
    ctx.fillText('CÓDIGO ÚNICO DEL COMPROBANTE', 620, 1235);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 29px monospace';
    ctx.fillText(code, 620, 1290);
    this._drawSecurityBars(ctx, code, 250, 1330, 740, 54);

    ctx.fillStyle = '#475569';
    ctx.font = '20px Arial';
    ctx.fillText(
      'Este documento certifica únicamente la participación del elector.',
      620,
      1515,
    );
    ctx.fillText(
      'No contiene ni permite identificar la selección realizada; el voto es secreto.',
      620,
      1550,
    );
    ctx.fillStyle = primary;
    ctx.font = '700 20px Arial';
    ctx.fillText('DOCUMENTO GENERADO AUTOMÁTICAMENTE POR EL SISTEMA VENP', 620, 1635);

    const link = document.createElement('a');
    link.download = `certificado-votacion-${data.elector.identificacion}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  private _drawReceiptField(
    ctx: CanvasRenderingContext2D,
    label: string,
    value: string,
    x: number,
    y: number,
  ): void {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '600 21px Arial';
    ctx.fillText(label, x, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 32px Arial';
    ctx.fillText(value, x, y + 48);
  }

  private _drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ): void {
    const words = text.split(/\s+/);
    let line = '';
    let lineY = y;
    for (const word of words) {
      const test = `${line}${word} `;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, lineY);
        line = `${word} `;
        lineY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line.trim(), x, lineY);
  }

  private _drawSecurityBars(
    ctx: CanvasRenderingContext2D,
    code: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const bits = [...code]
      .flatMap((char) =>
        char.charCodeAt(0).toString(2).padStart(8, '0').split(''),
      )
      .join('');
    const barWidth = width / bits.length;
    ctx.fillStyle = '#0f172a';
    [...bits].forEach((bit, index) => {
      if (bit === '1') {
        ctx.fillRect(x + index * barWidth, y, Math.max(1, barWidth), height);
      }
    });
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
