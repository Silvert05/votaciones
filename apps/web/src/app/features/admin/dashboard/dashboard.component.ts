import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { DashboardResumen, EstadoEleccion } from '../elections/models/election.model';
import { ElectionsService } from '../elections/services/elections.service';

const ETAPAS: EstadoEleccion[] = [
  'BORRADOR', 'CONVOCADA', 'PADRON_PUBLICADO', 'CANDIDATURAS_ABIERTAS',
  'CANDIDATURAS_CALIFICADAS', 'CAMPANIA', 'VOTACION_ABIERTA',
  'VOTACION_CERRADA', 'ESCRUTINIO', 'RESULTADOS_PROVISIONALES',
  'IMPUGNACION_RESULTADOS', 'RESULTADOS_DEFINITIVOS', 'POSESIONADA',
];

@Component({
  selector: 'admin-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [MatIconModule, RouterLink, DatePipe, DecimalPipe],
})
export default class DashboardComponent implements OnInit {
  private _elections = inject(ElectionsService);

  data: DashboardResumen | null = null;
  loading = true;

  ngOnInit(): void {
    this._elections.dashboard().pipe(finalize(() => (this.loading = false))).subscribe({
      next: (data) => (this.data = data),
    });
  }

  label(value: string | null | undefined): string {
    if (!value) return 'Sin iniciar';
    return value.toLowerCase().split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  progreso(estado: EstadoEleccion): number {
    if (estado === 'ANULADA') return 0;
    const index = ETAPAS.indexOf(estado);
    return index < 0 ? 0 : Math.round((index / (ETAPAS.length - 1)) * 100);
  }
}
