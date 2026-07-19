import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './dashboard.component.html'
})
export default class DashboardComponent implements OnInit { 
  
  loading: boolean = true;
  data: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    console.log('1. Iniciando DashboardComponent...');
    this.cargarResumenElectoral();
  }

  cargarResumenElectoral(): void {
    this.loading = true;
    this.cdr.detectChanges(); // Fuerza a mostrar el estado de carga

    setTimeout(() => {
      console.log('2. Temporizador terminado, asignando datos...');
      
      this.data = {
        resumen: {
          procesosActivos: 1,
          totalElecciones: 12,
          electoresActivos: 850,
          electores: 1200,
          listas: 3,
          candidaturasCalificadas: 15,
          votosEmitidos: 605
        },
        procesoActual: {
          nombre: 'Elecciones Institucionales 2026',
          estado: 'en_curso',
          updatedAt: new Date(),
          _count: { dignidades: 4, padron: 850, candidaturas: 3 }
        },
        participacion: {
          porcentaje: 71.17,
          votantes: 605,
          habilitados: 850
        },
        recientes: [
          {
            id: 1,
            nombre: 'Elecciones Generales 2025',
            estado: 'finalizado',
            updatedAt: new Date('2025-11-15'),
            _count: { padron: 800, candidaturas: 2, votosEmitidos: 750 }
          }
        ]
      };
      
      this.loading = false;
      this.cdr.detectChanges(); // Fuerza a Angular a quitar los esqueletos de carga
      console.log('3. Carga finalizada correctamente. Variable loading:', this.loading);
      
    }, 1200); 
  }

  label(estado: string): string {
    const estados: Record<string, string> = {
      'configuracion': 'En Configuración',
      'en_curso': 'Proceso Activo',
      'finalizado': 'Finalizado'
    };
    return estados[estado] || 'Desconocido';
  }

  progreso(estado: string): number {
    const porcentajes: Record<string, number> = {
      'configuracion': 35,
      'en_curso': 75,
      'finalizado': 100
    };
    return porcentajes[estado] || 0;
  }
}