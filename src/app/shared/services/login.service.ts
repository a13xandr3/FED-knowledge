import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { LoginPayload, LoginResponse } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private readonly http = inject(HttpClient);

  public readonly url = 'http://localhost:8080/api/auth/login';

  login(data: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.url, data).pipe(
        tap((response) => {
          localStorage.setItem('token', response.token); // salva token no navegador
        })
      );
  }
}
