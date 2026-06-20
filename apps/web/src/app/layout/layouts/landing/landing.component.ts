import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FuseLoadingBarComponent } from '@core/components/loading-bar';
import {
  FuseHorizontalNavigationComponent,
  FuseNavigationService,
  FuseVerticalNavigationComponent,
} from '@core/components/navigation';
import { FuseMediaWatcherService } from '@core/services/media-watcher';
import { Navigation } from '@core/services/navigation';
import { DataNavigation } from 'app/layout/data';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'landing-layout',
  templateUrl: './landing.component.html',
  encapsulation: ViewEncapsulation.None,
  imports: [
    FuseLoadingBarComponent,
    FuseVerticalNavigationComponent,
    FuseHorizontalNavigationComponent,
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

  ngOnInit(): void {
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
