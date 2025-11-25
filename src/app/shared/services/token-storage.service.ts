import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {

  //Responsabilidade única: armazenar token JWT e avaliar expiração.

  private readonly TOKEN_KEY = 'kb_token';

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /** Decodifica o payload do JWT (sem validar assinatura). */
  private decodePayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  /** Data de expiração (exp, em segundos desde epoch) ou null se não houver. */
  getExpirationDate(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodePayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return null;
    }

    const date = new Date(0);
    date.setUTCSeconds(payload.exp);
    return date;
  }

  /** true se token já expirou ou se não há exp válida. */
  isTokenExpired(): boolean {
    const exp = this.getExpirationDate();
    if (!exp) return true;
    return exp.getTime() <= Date.now();
  }

  /**
   * true se o token expira em até N segundos.
   * Se não houver token ou exp, assume que “vai expirar”.
   */
  willExpireIn(seconds: number): boolean {
    const exp = this.getExpirationDate();
    if (!exp) return true;

    const remainingMs = exp.getTime() - Date.now();
    return remainingMs <= seconds * 1000;
  }
}