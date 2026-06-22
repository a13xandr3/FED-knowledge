import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AuthService, LoginResponse } from './auth.service';
import { TokenStorageService } from './token-storage.service';

type AuthGuardResult = boolean | UrlTree;

export const AuthGuard: CanActivateFn = (): AuthGuardResult | Observable<AuthGuardResult> => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const redirectToLogin = () => router.createUrlTree(['/login']);
  const currentToken = tokenStorage.getToken();

  if (!currentToken || tokenStorage.isTokenExpired()) {
    tokenStorage.clear();
    return redirectToLogin();
  }

  if (!tokenStorage.willExpireIn(60)) {
    return true;
  }

  return authService.revalidateToken(currentToken).pipe(
    map((response: LoginResponse) => {
      if (response?.token) {
        return true;
      }

      tokenStorage.clear();
      return redirectToLogin();
    }),
    catchError(() => {
      tokenStorage.clear();
      return of(redirectToLogin());
    })
  );
};
