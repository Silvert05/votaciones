import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  success(message: string): void {
    this.toast('success', message);
  }

  error(message: string): void {
    this.toast('error', message);
  }

  warning(message: string): void {
    this.toast('warning', message);
  }

  info(message: string): void {
    this.toast('info', message);
  }

  private toast(icon: SweetAlertIcon, message: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title: message,
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      showClass: { popup: 'swal2-noanimation' },
      didOpen: (el) => {
        el.addEventListener('mouseenter', Swal.stopTimer);
        el.addEventListener('mouseleave', Swal.resumeTimer);
      },
    });
  }
}
