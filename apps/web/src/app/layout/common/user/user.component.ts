import { BooleanInput } from '@angular/cdk/coercion';
import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

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
    NgClass,
    MatDividerModule,
  ],
})
export class UserComponent implements OnInit, OnDestroy {

  static ngAcceptInputType_showAvatar: BooleanInput;


  @Input() showAvatar: boolean = true;
  user: any;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _router: Router,

  ) { }

  ngOnInit(): void {

  }


  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }


  updateUserStatus(status: string): void {
    if (!this.user) {
      return;
    }
  }


  signOut(): void {
    this._router.navigate(['/admin/login']);
  }
}
