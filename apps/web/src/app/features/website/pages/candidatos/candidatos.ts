import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CandidatosPublicos, VenpService } from '../../services/venp.service';

@Component({
  selector: 'app-candidatos',
  imports: [MatIconModule, RouterLink],
  templateUrl: './candidatos.html',
})
export default class CandidatosComponent implements OnInit {
  private _venp = inject(VenpService);
  private _cdr = inject(ChangeDetectorRef);

  cargando = true;
  data: CandidatosPublicos | null = null;

  ngOnInit(): void {
    this._venp.listElecciones().subscribe({
      next: (elecciones) => {
        const activa =
          elecciones.find((e) => e.votarDisponible) ??
          elecciones.find((e) => e.resultadosDisponibles) ??
          elecciones[0];
        if (!activa) {
          this.cargando = false;
          this._cdr.detectChanges();
          return;
        }
        this._venp
          .candidatos(activa.id)
          .pipe(
            finalize(() => {
              this.cargando = false;
              this._cdr.detectChanges();
            }),
          )
          .subscribe({
            next: (d) => (this.data = d),
            error: () => (this.data = null),
          });
      },
      error: () => {
        this.cargando = false;
        this._cdr.detectChanges();
      },
    });
  }

  foto(identificacion: string, fotoUrl: string | null): string {
    return fotoUrl || `https://i.pravatar.cc/200?u=${identificacion}`;
  }
}
