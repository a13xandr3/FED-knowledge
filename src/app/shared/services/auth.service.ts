import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
export interface LoginPayload {
  username: string;
  password: string;
  totp: string;
}
export interface LoginResponse {
  status: string;
  token: string;
}
@Injectable({ providedIn: 'root' })
export class AuthService {

  // Responsabilidade única: conversar com o BFF (backend) para login e revalidação de token.

  /** Endpoint do BFF para autenticação */
  private readonly api = 'http://localhost:8080/api/auth';

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService
  ) {}

  /**
   * Login: envia credenciais em plain-text para o BFF.
   * Backend é o único responsável por gerar/assinar o token.
   */
  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, payload)
      .pipe(
        tap(response => {
          if (response && response.token) {
            this.tokenStorage.setToken(response.token);
          }
        })
      );
  }
  /**
   * Revalida o token no backend quando estiver prestes a expirar.
   * Backend decide se o token ainda é válido ou retorna um novo.
   */
  revalidateToken(currentToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/revalidate`, { token: currentToken })
      .pipe(
        tap(res => {
          if (res?.token) this.tokenStorage.setToken(res.token);
        })
      );
  }
  logout(): void {
    this.tokenStorage.clear();
  }
  getToken(): string | null {
    return this.tokenStorage.getToken();
  }
}