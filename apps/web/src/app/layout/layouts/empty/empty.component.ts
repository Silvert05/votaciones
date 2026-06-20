import { Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FuseLoadingBarComponent } from '@core/components/loading-bar';
import { Subject } from 'rxjs';

@Component({
  selector: 'empty-layout',
  template: `
    <fuse-loading-bar/>
    <div class="flex w-full flex-auto flex-col">
      <div class="flex flex-auto flex-col">
        @if (true) {
          <router-outlet/>
        }
      </div>
    </div>`,
  encapsulation: ViewEncapsulation.None,
  imports: [FuseLoadingBarComponent, RouterOutlet],
})
export class EmptyLayout implements OnDestroy {
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
