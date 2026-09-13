import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subscription, interval, of, startWith, switchMap } from 'rxjs';
import { CandidatosPublicos, VenpService } from '../../services/venp.service';
import { PublicThemeService } from '../../services/public-theme.service';

type Dignidad = CandidatosPublicos['dignidades'][number];
type ListaConPropuesta = NonNullable<Dignidad['candidaturas'][number]['lista']>;

/** Refresca candidatos/listas para reflejar cambios del admin sin recargar la página. */
const REFRESCO_MS = 20000;

@Component({
    selector: 'app-candidatos',
    imports: [MatIconModule, RouterLink],
    templateUrl: './candidatos.html',
})
export default class CandidatosComponent implements OnInit, OnDestroy {
    private _venp = inject(VenpService);
    private _cdr = inject(ChangeDetectorRef);
    private _theme = inject(PublicThemeService);
    private _sub?: Subscription;

    cargando = true;
    data: CandidatosPublicos | null = null;

    ngOnInit(): void {
        this._sub = interval(REFRESCO_MS)
            .pipe(
                startWith(0),
                switchMap(() => this._venp.listElecciones()),
                switchMap((elecciones) => {
                    const activa =
                        elecciones.find((e) => e.votarDisponible) ?? elecciones[0];
                    if (!activa) return of(null);
                    this._theme.apply(activa.configuracion);
                    return this._venp.candidatos(activa.id);
                }),
            )
            .subscribe({
                next: (d) => {
                    this.data = d;
                    this.cargando = false;
                    this._cdr.detectChanges();
                },
                error: () => {
                    this.cargando = false;
                    this._cdr.detectChanges();
                },
            });
    }

    ngOnDestroy(): void {
        this._sub?.unsubscribe();
    }

    foto(identificacion: string, fotoUrl: string | null): string {
        return fotoUrl || '/img/avatar-placeholder.svg';
    }

    /** Listas con propuesta registrada entre las candidaturas de esta dignidad (sin duplicados). */
    propuestasDe(d: Dignidad): ListaConPropuesta[] {
        const vistas = new Set<string>();
        const listas: ListaConPropuesta[] = [];
        for (const c of d.candidaturas) {
            if (!c.lista?.propuesta || vistas.has(c.lista.id)) continue;
            vistas.add(c.lista.id);
            listas.push(c.lista);
        }
        return listas;
    }
}
