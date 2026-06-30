import { BooleanInput } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { AuthService } from 'app/features/admin/auth/services/auth.service';

@Component({
  selector: 'user',
  templateUrl: './user.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'user',
  imports: [
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
  ],
})
export class UserComponent {
  static ngAcceptInputType_showAvatar: BooleanInput;

  @Input() showAvatar: boolean = true;

  private _router = inject(Router);
  private _authService = inject(AuthService);

  readonly user = this._authService.user;

  goToProfile(): void {
    this._router.navigate(['/admin/perfil']);
  }

  signOut(): void {
    this._authService.logout().subscribe({
      next: () => this._router.navigate(['/admin/auth/login']),
      // Aunque falle la petición, se limpia la sesión y se redirige.
      error: () => {
        this._authService.clearSession();
        this._router.navigate(['/admin/auth/login']);
      },
    });
  }
}
