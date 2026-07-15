import { Component, Injectable, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Observable, map } from 'rxjs';

export interface InstitutionalDialogOptions {
  title: string;
  message?: string;
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface InstitutionalPromptOptions extends InstitutionalDialogOptions {
  inputLabel?: string;
  initialValue?: string;
  required?: boolean;
}

interface InstitutionalDialogData extends InstitutionalPromptOptions {
  mode: 'confirm' | 'prompt';
}

@Component({
  selector: 'app-institutional-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-card">
      <div class="flex items-start gap-4 px-6 pb-4 pt-6">
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          [class.bg-red-100]="data.danger"
          [class.text-red-600]="data.danger"
          [class.bg-blue-100]="!data.danger"
          [class.text-primary]="!data.danger"
        >
          <mat-icon [svgIcon]="data.icon || (data.danger ? 'heroicons_outline:exclamation-triangle' : 'heroicons_outline:information-circle')" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-extrabold leading-7 text-default">{{ data.title }}</h2>
          @if (data.message) {
            <p class="mt-1.5 text-sm leading-6 text-secondary">{{ data.message }}</p>
          }
        </div>
      </div>

      @if (data.mode === 'prompt') {
        <div class="px-6 pb-2">
          <mat-form-field class="w-full" appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ data.inputLabel || 'Observación' }}</mat-label>
            <textarea
              matInput
              rows="3"
              maxlength="500"
              [(ngModel)]="value"
              (keydown.control.enter)="submit()"
            ></textarea>
            <mat-hint align="end">{{ value.length }}/500</mat-hint>
          </mat-form-field>
        </div>
      }

      <div class="mt-3 flex justify-end gap-3 border-t bg-gray-50 px-6 py-4 dark:bg-gray-800/40">
        <button mat-button type="button" (click)="dialogRef.close(null)">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button
          mat-flat-button
          type="button"
          [color]="data.danger ? 'warn' : 'primary'"
          [disabled]="data.mode === 'prompt' && data.required && !value.trim()"
          (click)="submit()"
        >
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
})
export class InstitutionalDialogComponent {
  readonly data = inject<InstitutionalDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<InstitutionalDialogComponent>);
  value = this.data.initialValue ?? '';

  submit(): void {
    this.dialogRef.close(this.data.mode === 'prompt' ? this.value.trim() : true);
  }
}

@Injectable({ providedIn: 'root' })
export class InstitutionalDialogService {
  private readonly dialog = inject(MatDialog);

  confirm(options: InstitutionalDialogOptions): Observable<boolean> {
    return this.open({ ...options, mode: 'confirm' }).pipe(map((value) => value === true));
  }

  prompt(options: InstitutionalPromptOptions): Observable<string | null> {
    return this.open({ ...options, mode: 'prompt' }).pipe(
      map((value) => (typeof value === 'string' ? value : null)),
    );
  }

  private open(data: InstitutionalDialogData): Observable<unknown> {
    return this.dialog.open(InstitutionalDialogComponent, {
      width: 'min(92vw, 520px)',
      maxWidth: '92vw',
      autoFocus: data.mode === 'prompt' ? 'textarea' : false,
      restoreFocus: true,
      panelClass: 'institutional-dialog-panel',
      data,
    }).afterClosed();
  }
}
