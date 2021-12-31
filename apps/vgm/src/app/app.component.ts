import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Message } from '@vgm-converter/api-interfaces';

@Component({
  selector: 'vgm-converter-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  hello$ = this.http.get<Message>('/api/hello');
  constructor(private http: HttpClient) {}
}
