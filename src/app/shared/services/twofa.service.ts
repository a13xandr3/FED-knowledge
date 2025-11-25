import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TwofaService {
  private api = '/api/auth/2fa';
  constructor(private http: HttpClient) {}

  verify(email: string, code: string): Observable<any> {
    return this.http.post(`${this.api}/verify`, { email, code });
  }
}