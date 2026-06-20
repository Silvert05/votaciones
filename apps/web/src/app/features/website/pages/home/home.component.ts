import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [RouterLink, MatIconModule]
})
export default class HomeComponent {

  teams = [
    { name: 'Víctor Betun', position: 'Presidente', photo: 'https://i.pravatar.cc/300?u=10' },
    { name: 'José Avemañay', position: 'Secretario', photo: 'https://i.pravatar.cc/300?u=20' },
    { name: 'Norma Yumbo', position: 'Vocal', photo: 'https://i.pravatar.cc/300?u=30' },
    { name: 'Mario Guaman', position: 'Vocal', photo: 'https://i.pravatar.cc/300?u=40' },
    { name: 'María Yucailla', position: 'Vocal', photo: 'https://i.pravatar.cc/300?u=50' },
    { name: 'Daniel Coyago', position: 'Vocal', photo: 'https://i.pravatar.cc/300?u=60' }
  ]

  file = 'https://pdfobject.com/pdf/sample.pdf';

  path: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.path = this.sanitizer.bypassSecurityTrustResourceUrl(this.file);
  }
}
