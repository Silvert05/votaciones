import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotifyService } from 'app/shared/services/notify.service';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
import { concatMap, finalize, of } from 'rxjs';
import { DateTimePickerComponent } from 'app/shared/components/date-time-picker/date-time-picker.component';
import {
  CronogramaElectoral,
  CronogramaItem,
  Eleccion,
  EleccionDetalle,
  HitoDetalle,
  UpsertCronogramaPayload,
} from '../../models/election.model';
import { ElectionsService } from '../../services/elections.service';

/** Las fechas del proceso que viven como columnas en CronogramaElectoral. */
type CampoFijo =
  | 'fechaConvocatoria'
  | 'fechaPublicacionPadron'
  | 'fechaInicioInscripcion'
  | 'fechaFinInscripcion'
  | 'fechaInicioVotacion'
  | 'fechaFinVotacion'
  | 'fechaPublicacionResultados'
  | 'fechaResultadosFinales';

interface HitoFijoDef {
  campo: CampoFijo;
  label: string;
  icon: string;
}

/** Catálogo de hitos del proceso, en su orden lógico natural. */
const HITOS_FIJOS: HitoFijoDef[] = [
  { campo: 'fechaConvocatoria', label: 'Convocatoria del proceso', icon: 'lucide:megaphone' },
  { campo: 'fechaPublicacionPadron', label: 'Publicación del padrón', icon: 'lucide:users' },
  { campo: 'fechaInicioInscripcion', label: 'Apertura de candidaturas', icon: 'lucide:user-plus' },
  { campo: 'fechaFinInscripcion', label: 'Cierre de candidaturas', icon: 'lucide:users-round' },
  { campo: 'fechaInicioVotacion', label: 'Inicio de la votación', icon: 'lucide:mouse-pointer-click' },
  { campo: 'fechaFinVotacion', label: 'Cierre de la votación', icon: 'lucide:lock' },
  { campo: 'fechaPublicacionResultados', label: 'Resultados provisionales', icon: 'lucide:chart-bar' },
  { campo: 'fechaResultadosFinales', label: 'Resultados definitivos', icon: 'lucide:trophy' },
];

const CRONOGRAMA_FIELDS: CampoFijo[] = HITOS_FIJOS.map((h) => h.campo);

/**
 * Fechas sin las cuales la jornada electoral no puede ejecutarse (la Jornada
 * bloquea inicio de votación, cierre y generación de resultados). No se pueden
 * quitar del cronograma y deben llenarse antes de publicar.
 */
const HITOS_OBLIGATORIOS: CampoFijo[] = [
  'fechaInicioVotacion',
  'fechaFinVotacion',
  'fechaPublicacionResultados',
];

interface Hito {
  key: string; // campo fijo  |  `item:<id>`
  tipo: 'fijo' | 'item';
  label: string;
  icon: string;
  fecha: string | null;
  fechaFin: string | null;
  descripcion: string | null;
  formatted: string;
  campo?: CampoFijo;
  item?: CronogramaItem;
  obligatorio: boolean;
}

@Component({
  selector: 'admin-election-schedule',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
    DateTimePickerComponent,
    DragDropModule,
  ],
  templateUrl: './election-schedule.component.html',
})
export default class ElectionScheduleComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _notifyService = inject(NotifyService);
  private _institutionalDialog = inject(InstitutionalDialogService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  elecciones: Eleccion[] = [];
  selected: EleccionDetalle | null = null;
  selectedIdCtrl = new FormControl<string>('');
  loading = false;
  publicando = false;

  /**
   * Buffer de escritura de las fechas fijas. No se enlaza a la plantilla: cada
   * hito se edita desde el panel de la derecha, pero al guardar uno se envía el
   * cronograma completo (upsert reemplaza todas las columnas).
   */
  form = this._fb.group({
    fechaConvocatoria: [''],
    fechaPublicacionPadron: [''],
    fechaInicioInscripcion: [''],
    fechaFinInscripcion: [''],
    fechaInicioVotacion: [''],
    fechaFinVotacion: [''],
    fechaPublicacionResultados: [''],
    fechaResultadosFinales: [''],
  });

  cronogramaItems: CronogramaItem[] = [];
  editingItemId: string | null = null;
  editingFijoCampo: CampoFijo | null = null;
  savingItem = false;

  itemForm = this._fb.group({
    nombre: ['', Validators.required],
    fecha: [''],
    fechaFin: [''],
    descripcion: [''],
  });

  editingEtiquetaKey: string | null = null;
  etiquetaCtrl = new FormControl('');

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedIdCtrl.valueChanges.subscribe((id) => {
      if (id) {
        this.loadDetalle(id);
      } else {
        this.selected = null;
        this.form.reset();
      }
    });
  }

  loadElecciones(): void {
    this.loading = true;
    this._electionsService
      .list({ page: 1, limit: 100 })
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.elecciones = res.data;
          if (!this.selectedIdCtrl.value && res.data.length) {
            this.selectedIdCtrl.setValue(res.data[0].id);
          }
        },
        error: () => this._notifyError('No se pudieron cargar las elecciones.'),
      });
  }

  loadDetalle(id: string): void {
    this.loading = true;
    this._electionsService
      .get(id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (detalle) => {
          this.selected = detalle;
          this.patchCronograma(detalle.cronograma);
          this.resetItemForm();
          this.loadCronogramaItems(id);
        },
        error: () => this._notifyError('No se pudo cargar el cronograma.'),
      });
  }

  loadCronogramaItems(eleccionId: string): void {
    this._electionsService.listCronogramaItems(eleccionId).subscribe({
      next: (items) => {
        this.cronogramaItems = items;
        this.normalizarOrden();
        this._changeDetectorRef.detectChanges();
      },
      error: () =>
        this._notifyError('No se pudieron cargar los ítems del cronograma.'),
    });
  }

  // ── Lista unificada ──────────────────────────────────────────────────────

  get ordenHitos(): string[] {
    return this.selected?.cronograma?.ordenHitos ?? [];
  }

  /** Todos los hitos (fijos + libres) en el orden que define el admin. */
  get hitos(): Hito[] {
    const cronograma = this.selected?.cronograma ?? null;
    const etiquetas: Record<string, string> = cronograma?.etiquetasHitos ?? {};
    const orden = this.ordenHitos;

    // Los hitos del proceso son un armazón fijo: siempre están en la lista (con
    // fecha o como "Sin fecha"). La fecha de fin es opcional (rango); se deja
    // vacía en los que son un solo momento (p. ej. "Inicio de la votación").
    const detalles = cronograma?.detallesHitos ?? {};
    const fijos: Hito[] = HITOS_FIJOS.map((def) => {
      const fecha = cronograma?.[def.campo] ?? null;
      const detalle = detalles[def.campo] ?? {};
      const fechaFin = detalle.fechaFin ?? null;
      return {
        key: def.campo,
        tipo: 'fijo' as const,
        label: etiquetas[def.campo] || def.label,
        icon: def.icon,
        fecha,
        fechaFin,
        descripcion: detalle.descripcion ?? null,
        formatted: this.formatRango(fecha, fechaFin),
        campo: def.campo,
        obligatorio: HITOS_OBLIGATORIOS.includes(def.campo),
      };
    });

    const items: Hito[] = this.cronogramaItems.map((item) => ({
      key: `item:${item.id}`,
      tipo: 'item' as const,
      label: item.nombre,
      icon: 'lucide:clipboard-list',
      fecha: item.fecha,
      fechaFin: item.fechaFin,
      descripcion: item.descripcion,
      formatted: this.formatRango(item.fecha, item.fechaFin),
      item,
      obligatorio: false,
    }));

    const posicion = (key: string) => {
      const idx = orden.indexOf(key);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };

    return [...fijos, ...items]
      .map((hito, indiceOriginal) => ({ hito, indiceOriginal, pos: posicion(hito.key) }))
      .sort((a, b) => a.pos - b.pos || a.indiceOriginal - b.indiceOriginal)
      .map((entry) => entry.hito);
  }

  /** Lo que se publica en la vista pública: los hitos con alguna fecha. */
  get hitosPreview(): Hito[] {
    return this.hitos.filter((h) => h.fecha || h.fechaFin);
  }

  get hitosSinFecha(): number {
    return this.hitos.filter((h) => !h.fecha && !h.fechaFin).length;
  }

  /** "12 ago" · "Hasta 14 ago" · "12 ago — 14 ago" · "Fecha pendiente". */
  formatRango(fecha?: string | null, fechaFin?: string | null): string {
    if (fecha && fechaFin) {
      return `${this.formatFecha(fecha)} — ${this.formatFecha(fechaFin)}`;
    }
    if (fechaFin && !fecha) return `Hasta ${this.formatFecha(fechaFin)}`;
    return this.formatFecha(fecha);
  }

  /** Etiquetas de las fechas obligatorias que todavía no tienen valor. */
  get obligatoriasFaltantes(): string[] {
    const cronograma = this.selected?.cronograma ?? null;
    return HITOS_FIJOS.filter(
      (def) =>
        HITOS_OBLIGATORIOS.includes(def.campo) && !cronograma?.[def.campo],
    ).map((def) => cronograma?.etiquetasHitos?.[def.campo] || def.label);
  }

  get cronogramaPublicado(): boolean {
    return !!this.selected?.cronograma?.publicado;
  }

  /**
   * Por qué el portal aún NO muestra este cronograma aunque esté publicado
   * (motivo ajeno al cronograma). `null` = sí se muestra.
   */
  get motivoOcultoEnPortal(): string | null {
    if (!this.selected) return null;
    if (!this.selected.portalPublico) {
      return 'esta elección no está seleccionada como el proceso del portal público (se marca desde Gestión)';
    }
    const estado = this.selected.estado;
    if (estado === 'BORRADOR' || estado === 'ANULADA') {
      return `la elección está en ${estado}; aparecerá cuando se convoque`;
    }
    return null;
  }

  publicar(publicado: boolean): void {
    if (!this.selected) return;
    if (publicado && this.obligatoriasFaltantes.length) {
      this._notifyService.warning(
        `Faltan fechas obligatorias para la jornada: ${this.obligatoriasFaltantes.join(', ')}.`,
      );
      return;
    }
    if (publicado && !this.hitosPreview.length) {
      this._notifyService.warning(
        'Agrega al menos un hito con fecha antes de publicar.',
      );
      return;
    }
    this.publicando = true;
    this._electionsService
      .publicarCronograma(this.selected.id, publicado)
      .pipe(finalize(() => (this.publicando = false)))
      .subscribe({
        next: (cronograma) => {
          this.aplicarCronograma(cronograma);
          this._notify(
            publicado
              ? 'Cronograma publicado en el portal.'
              : 'Cronograma oculto del portal.',
          );
        },
        error: (err) =>
          this._notifyError(
            this.errorMessage(err, 'No se pudo actualizar la publicación.'),
          ),
      });
  }

  estaEditando(hito: Hito): boolean {
    return hito.tipo === 'item'
      ? !!this.editingItemId && hito.item?.id === this.editingItemId
      : hito.campo === this.editingFijoCampo;
  }

  onHitoDrop(event: CdkDragDrop<Hito[]>): void {
    if (!this.selected || event.previousIndex === event.currentIndex) return;

    const nuevoOrden = [...this.hitos];
    moveItemInArray(nuevoOrden, event.previousIndex, event.currentIndex);
    this.persistirOrden(nuevoOrden.map((hito) => hito.key));
  }

  // ── Editar / agregar / quitar ────────────────────────────────────────────

  editHito(hito: Hito): void {
    if (hito.tipo === 'item' && hito.item) {
      this.editItem(hito.item);
    } else if (hito.campo) {
      this.editFijo(hito);
    }
  }

  removeHito(hito: Hito): void {
    if (hito.tipo === 'item' && hito.item) {
      this.deleteItem(hito.item);
    } else if (hito.campo) {
      this.removeFijo(hito);
    }
  }

  editItem(item: CronogramaItem): void {
    this.editingFijoCampo = null;
    this.editingItemId = item.id;
    this.itemForm.reset({
      nombre: item.nombre,
      fecha: this.toLocalDateTime(item.fecha),
      fechaFin: this.toLocalDateTime(item.fechaFin),
      descripcion: item.descripcion ?? '',
    });
  }

  editFijo(hito: Hito): void {
    if (!hito.campo) return;
    this.editingItemId = null;
    this.editingFijoCampo = hito.campo;
    this.itemForm.reset({
      nombre: hito.label,
      fecha: this.toLocalDateTime(hito.fecha),
      fechaFin: this.toLocalDateTime(hito.fechaFin),
      descripcion: hito.descripcion ?? '',
    });
  }

  resetItemForm(): void {
    this.editingItemId = null;
    this.editingFijoCampo = null;
    this.itemForm.reset({ nombre: '', fecha: '', fechaFin: '', descripcion: '' });
  }

  saveItem(): void {
    if (!this.selected) return;

    if (this.editingFijoCampo) {
      this.saveFijo();
      return;
    }

    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const raw = this.itemForm.getRawValue();
    const fecha = this.toIsoDateTime(raw.fecha);
    const fechaFin = this.toIsoDateTime(raw.fechaFin);
    if (!fecha && !fechaFin) {
      this._notifyService.warning('Indica al menos una fecha: de inicio o de fin.');
      return;
    }
    if (fecha && fechaFin && new Date(fechaFin) <= new Date(fecha)) {
      this._notifyService.warning(
        'La fecha de fin debe ser posterior a la de inicio (revisa el día y la hora).',
      );
      return;
    }
    const payload = {
      nombre: raw.nombre!,
      fecha,
      fechaFin,
      descripcion: raw.descripcion || null,
    };

    const eleccionId = this.selected.id;
    const editingId = this.editingItemId;
    this.savingItem = true;
    const request$ = editingId
      ? this._electionsService.updateCronogramaItem(eleccionId, editingId, payload)
      : this._electionsService.createCronogramaItem(eleccionId, payload);

    request$.pipe(finalize(() => (this.savingItem = false))).subscribe({
      next: (item) => {
        if (editingId) {
          this.cronogramaItems = this.cronogramaItems.map((i) =>
            i.id === item.id ? item : i,
          );
        } else {
          // Un ítem nuevo se agrega al final de la lista; el admin luego lo
          // reordena arrastrándolo.
          this.cronogramaItems = [...this.cronogramaItems, item];
          this.persistirOrden([...this.ordenHitos, `item:${item.id}`], true);
        }
        this._notify(editingId ? 'Ítem actualizado.' : 'Ítem agregado.');
        this.resetItemForm();
      },
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo guardar el ítem.')),
    });
  }

  private saveFijo(): void {
    if (!this.selected || !this.editingFijoCampo) return;
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const campo = this.editingFijoCampo;
    const raw = this.itemForm.getRawValue();
    const iso = this.toIsoDateTime(raw.fecha);
    const fechaFinIso = this.toIsoDateTime(raw.fechaFin);
    if (!iso && !fechaFinIso) {
      this._notifyService.warning('Indica al menos una fecha: de inicio o de fin.');
      return;
    }
    if (iso && fechaFinIso && new Date(fechaFinIso) <= new Date(iso)) {
      this._notifyService.warning(
        'La fecha de fin debe ser posterior a la de inicio (revisa el día y la hora).',
      );
      return;
    }

    const def = HITOS_FIJOS.find((d) => d.campo === campo)!;
    const etiqueta = (raw.nombre ?? '').trim();
    const eleccionId = this.selected.id;

    const detalle: HitoDetalle = {};
    if (fechaFinIso) detalle.fechaFin = fechaFinIso;
    const descripcion = (raw.descripcion ?? '').trim();
    if (descripcion) detalle.descripcion = descripcion;
    const detallesHitos: Record<string, HitoDetalle> = {
      ...(this.selected.cronograma?.detallesHitos ?? {}),
    };
    if (Object.keys(detalle).length) detallesHitos[campo] = detalle;
    else delete detallesHitos[campo];

    this.form.get(campo)!.setValue(this.toLocalDateTime(iso));

    this.savingItem = true;
    this._electionsService
      .upsertCronograma(eleccionId, { ...this.buildPayload(), detallesHitos })
      .pipe(
        concatMap((cronograma) => {
          this.aplicarCronograma(cronograma);
          const actual = cronograma.etiquetasHitos?.[campo] ?? def.label;
          if (!etiqueta || etiqueta === actual) return of(cronograma);
          return this._electionsService.updateEtiquetasCronograma(eleccionId, {
            [campo]: etiqueta,
          });
        }),
        concatMap((cronograma) => {
          if (this.ordenHitos.includes(campo)) return of(cronograma);
          return this._electionsService.updateOrdenCronograma(eleccionId, [
            ...this.ordenHitos,
            campo,
          ]);
        }),
        finalize(() => (this.savingItem = false)),
      )
      .subscribe({
        next: (cronograma) => {
          this.aplicarCronograma(cronograma);
          this._notify('Hito actualizado.');
          this.resetItemForm();
        },
        error: (err) =>
          this._notifyError(this.errorMessage(err, 'No se pudo guardar el hito.')),
      });
  }

  deleteItem(item: CronogramaItem): void {
    if (!this.selected) return;
    const eleccionId = this.selected.id;

    this._institutionalDialog
      .confirm({
        title: 'Eliminar ítem del cronograma',
        message: `Se eliminará "${item.nombre}" del cronograma. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this._electionsService
          .deleteCronogramaItem(eleccionId, item.id)
          .subscribe({
            next: () => {
              this.cronogramaItems = this.cronogramaItems.filter(
                (i) => i.id !== item.id,
              );
              if (this.editingItemId === item.id) this.resetItemForm();
              const key = `item:${item.id}`;
              if (this.ordenHitos.includes(key)) {
                this.persistirOrden(
                  this.ordenHitos.filter((k) => k !== key),
                  true,
                );
              }
              this._notify('Ítem eliminado.');
            },
            error: (err) =>
              this._notifyError(this.errorMessage(err, 'No se pudo eliminar el ítem.')),
          });
      });
  }

  /** En un hito del proceso "quitar" = borrar su fecha; el hito sigue en la lista. */
  private removeFijo(hito: Hito): void {
    if (!this.selected || !hito.campo) return;
    if (hito.obligatorio) {
      this._notifyService.warning(
        `"${hito.label}" es obligatoria para la jornada electoral y no se puede borrar.`,
      );
      return;
    }
    if (!hito.fecha && !hito.fechaFin && !hito.descripcion) return;

    const campo = hito.campo;
    const eleccionId = this.selected.id;
    const detallesActuales = this.selected.cronograma?.detallesHitos ?? {};

    this._institutionalDialog
      .confirm({
        title: 'Borrar las fechas del hito',
        message: `Se borrarán las fechas de "${hito.label}". El hito seguirá en la lista como "Sin fecha" y podrás volver a ponerle una cuando quieras.`,
        confirmText: 'Borrar',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.form.get(campo)!.setValue('');
        const detallesHitos: Record<string, HitoDetalle> = { ...detallesActuales };
        delete detallesHitos[campo];

        this.savingItem = true;
        this._electionsService
          .upsertCronograma(eleccionId, { ...this.buildPayload(), detallesHitos })
          .pipe(finalize(() => (this.savingItem = false)))
          .subscribe({
            next: (cronograma) => {
              this.aplicarCronograma(cronograma);
              if (this.editingFijoCampo === campo) this.resetItemForm();
              this._notify('Fecha borrada.');
            },
            error: (err) =>
              this._notifyError(this.errorMessage(err, 'No se pudo borrar la fecha.')),
          });
      });
  }

  // ── Renombrar el título público (solo hitos del proceso) ─────────────────

  startEditEtiqueta(hito: Hito): void {
    this.editingEtiquetaKey = hito.key;
    this.etiquetaCtrl.setValue(hito.label);
  }

  cancelEditEtiqueta(): void {
    this.editingEtiquetaKey = null;
  }

  saveEtiqueta(hito: Hito): void {
    if (this.editingEtiquetaKey !== hito.key || !this.selected) {
      this.editingEtiquetaKey = null;
      return;
    }
    this.editingEtiquetaKey = null;

    const nuevoValor = (this.etiquetaCtrl.value ?? '').trim();
    if (!nuevoValor || nuevoValor === hito.label) return;

    const eleccionId = this.selected.id;
    this._electionsService
      .updateEtiquetasCronograma(eleccionId, { [hito.key]: nuevoValor })
      .subscribe({
        next: (cronograma) => this.aplicarCronograma(cronograma),
        error: (err) =>
          this._notifyError(this.errorMessage(err, 'No se pudo renombrar el título.')),
      });
  }

  // ── Orden ───────────────────────────────────────────────────────────────

  /**
   * Asegura que `ordenHitos` contenga exactamente los hitos existentes (los 9
   * del proceso + los ítems libres). Con esto un hito sin fecha sigue siendo
   * una tarjeta editable en lugar de "quedar quemado" fuera de la lista.
   */
  private normalizarOrden(): void {
    if (!this.selected) return;

    const orden = this.ordenHitos;
    const conocidos = new Set(orden);
    const merged = [...orden];

    for (const def of HITOS_FIJOS) {
      if (!conocidos.has(def.campo)) merged.push(def.campo);
    }
    for (const item of this.cronogramaItems) {
      const key = `item:${item.id}`;
      if (!conocidos.has(key)) merged.push(key);
    }

    const validos = new Set<string>([
      ...HITOS_FIJOS.map((d) => d.campo as string),
      ...this.cronogramaItems.map((i) => `item:${i.id}`),
    ]);
    const limpio = merged.filter((k) => validos.has(k));

    if (limpio.length && !this.mismoOrden(limpio, orden)) {
      this.persistirOrden(limpio, true);
    }
  }

  private mismoOrden(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((valor, i) => valor === b[i]);
  }

  private persistirOrden(orden: string[], silencioso = false): void {
    if (!this.selected) return;

    this._electionsService
      .updateOrdenCronograma(this.selected.id, orden)
      .subscribe({
        next: (cronograma) => this.aplicarCronograma(cronograma),
        error: (err) => {
          if (!silencioso) {
            this._notifyError(
              this.errorMessage(err, 'No se pudo guardar el nuevo orden.'),
            );
          }
        },
      });
  }

  // ── Utilidades ──────────────────────────────────────────────────────────

  private aplicarCronograma(cronograma: CronogramaElectoral): void {
    if (this.selected) {
      this.selected = { ...this.selected, cronograma };
    }
    this.patchCronograma(cronograma);
    this._changeDetectorRef.detectChanges();
  }

  formatFecha(value?: string | null): string {
    if (!value) return 'Fecha pendiente';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Fecha pendiente';
    return new Intl.DateTimeFormat('es-EC', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private patchCronograma(cronograma: CronogramaElectoral | null): void {
    const values: Record<string, string> = {};
    for (const field of CRONOGRAMA_FIELDS) {
      values[field] = this.toLocalDateTime(cronograma?.[field] ?? null);
    }
    this.form.reset(values);
  }

  private buildPayload(): UpsertCronogramaPayload {
    const raw = this.form.getRawValue();
    const payload: UpsertCronogramaPayload = {};
    for (const field of CRONOGRAMA_FIELDS) {
      payload[field] = this.toIsoDateTime(raw[field]);
    }
    return payload;
  }

  private toIsoDateTime(value?: string | null): string | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toLocalDateTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
