import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  template: `<router-outlet />`,
  styles: [`
  :host {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
}
`],
  imports: [RouterOutlet],
})
export class AppComponent {
  /**
   * Constructor
   */
  constructor() { }
}
