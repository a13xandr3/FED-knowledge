import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TwofaService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/auth/2fa';

  verify(email: string, code: string): Observable<unknown> {
    return this.http.post(`${this.api}/verify`, { email, code });
  }
}
