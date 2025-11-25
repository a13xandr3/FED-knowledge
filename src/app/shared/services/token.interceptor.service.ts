import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { TokenStorageService } from './token-storage.service';
import { AuthService } from './auth.service';

// Se seu AuthService retorna { token: string }, tipamos o mínimo aqui:
type RevalidateResponse = { token: string };

let isRefreshing = false;

export const tokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const tokenStorage = inject(TokenStorageService);
  const authService  = inject(AuthService);
  const router       = inject(Router);

  // Não interceptar endpoints de auth para evitar loop
  if (req.url.includes('/api/auth')) {
    return next(req);
  }

  const currentToken = tokenStorage.getToken();
  if (!currentToken) {
    return next(req);
  }

  const aboutToExpire = tokenStorage.willExpireIn(60); // ≤ 60s

  const forward = (r: HttpRequest<any>) =>
    next(r).pipe(catchError(err => handleAuthError(err, tokenStorage, router)));

  // Ainda válido (ou já estamos renovando): apenas segue com Authorization
  if (!aboutToExpire || isRefreshing) {
    const withAuth = req.clone({ setHeaders: { Authorization: `Bearer ${currentToken}` } });
    return forward(withAuth);
  }

  // Renovar antes de enviar
  isRefreshing = true;
  return authService.revalidateToken(currentToken).pipe(
    switchMap((resp: RevalidateResponse) => {
      isRefreshing = false;

      const newToken = resp?.token;
      if (!newToken) {
        tokenStorage.clear();
        router.navigate(['/login']);
        return throwError(() => new Error('Token inválido na revalidação'));
      }

      // Persistir o novo token (se o AuthService ainda não o fez)
      tokenStorage.setToken(newToken);

      const refreshedReq = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
      return next(refreshedReq);
    }),
    catchError(err => {
      isRefreshing = false;
      tokenStorage.clear();
      router.navigate(['/login']);
      return throwError(() => err);
    })
  );
};
function handleAuthError(err: any, tokenStorage: TokenStorageService, router: Router) {
  if (err?.status === 401 || err?.status === 403) {
    tokenStorage.clear();
    router.navigate(['/login']);
  }
  return throwError(() => err);
}