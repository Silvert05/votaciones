import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './not-found.component.html',
})
export default class NotFoundComponent {
  private _route = inject(ActivatedRoute);

  readonly title = this._route.snapshot.data['title'] ?? 'Página no encontrada';
  readonly description =
    this._route.snapshot.data['description'] ??
    'La ruta solicitada no existe o ya no está disponible.';
  readonly homeLink = this._route.snapshot.data['homeLink'] ?? '/inicio';
  readonly homeLabel = this._route.snapshot.data['homeLabel'] ?? 'Volver al inicio';
}
