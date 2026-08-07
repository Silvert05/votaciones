import { Component, Input, OnDestroy, forwardRef } from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { DateTime } from 'luxon';
import { Subscription, merge } from 'rxjs';

@Component({
  selector: 'app-date-time-picker',
  imports: [
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTimepickerModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimePickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>{{ label }}</mat-label>
        <input
          matInput
          readonly
          [required]="required"
          [min]="today"
          [matDatepicker]="calendar"
          [formControl]="dateCtrl"
          (blur)="markTouched()"
        />
        <mat-datepicker-toggle
          matIconSuffix
          [for]="calendar"
          aria-label="Abrir calendario"
        />
        <mat-datepicker #calendar />
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Hora</mat-label>
        <input
          matInput
          readonly
          [required]="required"
          [matTimepicker]="clock"
          [formControl]="timeCtrl"
          (blur)="markTouched()"
        />
        <mat-timepicker-toggle
          matIconSuffix
          [for]="clock"
          aria-label="Abrir selector de hora"
        />
        <mat-timepicker #clock [interval]="900" />
      </mat-form-field>
    </div>
  `,
})
export class DateTimePickerComponent
  implements ControlValueAccessor, OnDestroy
{
  @Input() label = 'Fecha';
  @Input() required = false;

  readonly today = DateTime.now().startOf('day');
  readonly dateCtrl = new FormControl<DateTime | null>(null);
  readonly timeCtrl = new FormControl<DateTime | null>(
    DateTime.now().set({ hour: 8, minute: 0, second: 0, millisecond: 0 }),
  );

  private readonly _subscription: Subscription;
  private _onChange: (value: string | null) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor() {
    this._subscription = merge(
      this.dateCtrl.valueChanges,
      this.timeCtrl.valueChanges,
    ).subscribe(() => this._emitValue());
  }

  writeValue(value: string | null): void {
    const parsed = value ? DateTime.fromISO(value) : null;
    const valid = parsed?.isValid ? parsed : null;
    const defaultTime = DateTime.now().set({
      hour: 8,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
    this.dateCtrl.setValue(valid?.startOf('day') ?? null, {
      emitEvent: false,
    });
    this.timeCtrl.setValue(valid ?? defaultTime, {
      emitEvent: false,
    });
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    if (disabled) {
      this.dateCtrl.disable({ emitEvent: false });
      this.timeCtrl.disable({ emitEvent: false });
    } else {
      this.dateCtrl.enable({ emitEvent: false });
      this.timeCtrl.enable({ emitEvent: false });
    }
  }

  markTouched(): void {
    this._onTouched();
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  private _emitValue(): void {
    const date = this.dateCtrl.value;
    const time = this.timeCtrl.value;
    if (!date || !date.isValid || !time || !time.isValid) {
      this._onChange(null);
      return;
    }

    this._onChange(
      date
        .set({
          hour: time.hour,
          minute: time.minute,
          second: 0,
          millisecond: 0,
        })
        .toFormat("yyyy-MM-dd'T'HH:mm"),
    );
  }
}
