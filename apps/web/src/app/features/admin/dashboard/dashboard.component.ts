import { Component } from '@angular/core';

@Component({
  selector: 'admin-dashboard',
  template: `
    <div class="flex flex-col flex-auto p-6 sm:p-10">
      <div class="text-4xl font-extrabold tracking-tight leading-tight">Dashboard</div>
      <p class="mt-2 text-secondary">Panel de administración – Tribunal Electoral FIERPI</p>
    </div>
  `,
})
export default class DashboardComponent { }
