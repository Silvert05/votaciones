import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import { ConteoVoto, ResultadosResponse } from '../../models/votacion.model';
import { VotacionService } from '../../services/votacion.service';

@Component({
  selector: 'admin-resultados-votacion',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './resultados.component.html',
})
export default class ResultadosComponent implements OnInit {
  private _electionsService = inject(ElectionsService);
  private _votacionService = inject(VotacionService);
  private _snackBar = inject(MatSnackBar);

  elecciones: Eleccion[] = [];
  resultados: ResultadosResponse | null = null;
  loading = false;

  selectedEleccionCtrl = new FormControl<string>('', { nonNullable: true });

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedEleccionCtrl.valueChanges.subscribe(() => this.loadResultados());
  }

  loadElecciones(): void {
    this._electionsService.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.elecciones = res.data;
        if (!this.selectedEleccionCtrl.value && res.data.length) {
          this.selectedEleccionCtrl.setValue(res.data[0].id);
        }
      },
      error: () => this._notify('No se pudieron cargar las elecciones.'),
    });
  }

  loadResultados(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this.resultados = null;
      return;
    }
    this.loading = true;
    this._votacionService
      .resultados(eleccionId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.resultados = res;
        },
        error: (err) =>
          this._notify(this.errorMessage(err, 'No se pudieron cargar resultados.')),
      });
  }

  conteosPorDignidad(dignidadId: string): ConteoVoto[] {
    return (this.resultados?.conteos ?? []).filter(
      (conteo) => conteo.dignidadId === dignidadId,
    );
  }

  emitidosPorDignidad(dignidadId: string): number {
    return (
      this.resultados?.emitidos.find((item) => item.dignidadId === dignidadId)
        ?.total ?? 0
    );
  }

  opcionLabel(conteo: ConteoVoto): string {
    if (conteo.tipo === 'BLANCO') return 'Voto blanco';
    if (conteo.tipo === 'NULO') return 'Voto nulo';
    const elector = conteo.candidatura?.elector;
    const lista = conteo.candidatura?.lista;
    return `${elector?.apellidos ?? ''} ${elector?.nombres ?? ''}${
      lista ? ` - ${lista.codigo} ${lista.nombre}` : ''
    }`;
  }

  porcentaje(total: number, emitidos: number): number {
    if (!emitidos) return 0;
    return Math.round((total / emitidos) * 100);
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
