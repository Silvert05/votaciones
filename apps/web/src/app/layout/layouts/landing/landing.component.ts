import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FuseLoadingBarComponent } from '@core/components/loading-bar';
import {
  FuseHorizontalNavigationComponent,
  FuseNavigationService,
  FuseVerticalNavigationComponent,
} from '@core/components/navigation';
import { FuseStickyScrollBlockFixDirective } from '@core/directives/sticky-scroll-block-fix';
import { FuseMediaWatcherService } from '@core/services/media-watcher';
import { Navigation } from '@core/services/navigation';
import { DataNavigation } from 'app/layout/data';
import { PublicThemeService } from 'app/features/website/services/public-theme.service';
import { VenpService } from 'app/features/website/services/venp.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'landing-layout',
  templateUrl: './landing.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [
    FuseLoadingBarComponent,
    FuseVerticalNavigationComponent,
    FuseHorizontalNavigationComponent,
    FuseStickyScrollBlockFixDirective,
    MatButtonModule,
    MatIconModule,
    RouterOutlet,
    RouterLink,
  ],
})
export class LandingLayout implements OnInit, OnDestroy {
  isScreenSmall: boolean;
  navigation: Navigation = DataNavigation;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  readonly theme = inject(PublicThemeService).theme;
  private _publicTheme = inject(PublicThemeService);
  private _venp = inject(VenpService);

  /**
   * Constructor
   */
  constructor(

    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _fuseNavigationService: FuseNavigationService
  ) { }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/img/logo.png')) image.src = '/img/logo.png';
  }

  ngOnInit(): void {
    this._venp.listElecciones().pipe(takeUntil(this._unsubscribeAll)).subscribe({
      next: (elecciones) => {
        const activa = elecciones.find((item) => item.votarDisponible) ??
          elecciones.find((item) => item.resultadosDisponibles) ?? elecciones[0];
        this._publicTheme.apply(activa?.configuracion);
      },
    });

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
