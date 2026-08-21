import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { FuseLoadingBarComponent } from '@core/components/loading-bar';
import {
  FuseNavigationService,
  FuseVerticalNavigationComponent,
} from '@core/components/navigation';
import { FuseStickyScrollBlockFixDirective } from '@core/directives/sticky-scroll-block-fix';
import { FuseMediaWatcherService } from '@core/services/media-watcher';
import { AuthService } from 'app/features/admin/auth/services/auth.service';
import { UserComponent } from 'app/layout/common/user/user.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'admin-layout',
  templateUrl: './admin.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [
    FuseLoadingBarComponent,
    FuseVerticalNavigationComponent,
    FuseStickyScrollBlockFixDirective,
    MatButtonModule,
    MatIconModule,
    UserComponent,
    RouterOutlet,
  ],
})
export class AdminLayout implements OnInit, OnDestroy {
  isScreenSmall: boolean;

  private _authService = inject(AuthService);

  /** Navegación filtrada según el rol del usuario autenticado. */
  navigation = computed(() => this._authService.menu());

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _fuseNavigationService: FuseNavigationService
  ) { }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  ngOnInit(): void {
    this._authService.refreshAccess().subscribe({ error: () => {} });

    this._fuseMediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {
        this.isScreenSmall = !matchingAliases.includes('md');
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  toggleNavigation(name: string): void {
    const navigation =
      this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(
        name
      );

    if (navigation) {
      navigation.toggle();
    }
  }
}
