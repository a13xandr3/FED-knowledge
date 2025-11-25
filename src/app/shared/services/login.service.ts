import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  public url = 'http://localhost:8080/api/auth/login';
  
  constructor(private http: HttpClient) { }

  login(data: any): Observable<any> {
    return this.http.post<{ token: string }>(this.url, data ).pipe(
        tap((response: any) => {
          localStorage.setItem('token', response.token); // salva token no navegador
        })
      );
  }
}