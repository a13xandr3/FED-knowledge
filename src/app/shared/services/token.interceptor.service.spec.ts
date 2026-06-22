import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, Subject, firstValueFrom, of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { tokenInterceptor } from './token.interceptor.service';

describe('tokenInterceptor', () => {
  let tokenStorage: { getToken: jest.Mock; willExpireIn: jest.Mock; setToken: jest.Mock; clear: jest.Mock };
  let authService: { revalidateToken: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    tokenStorage = {
      getToken: jest.fn(),
      willExpireIn: jest.fn(),
      setToken: jest.fn(),
      clear: jest.fn(),
    };
    authService = {
      revalidateToken: jest.fn(),
    };
    router = {
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TokenStorageService, useValue: tokenStorage },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('should export the functional interceptor', () => {
    expect(tokenInterceptor).toBeTruthy();
  });

  it('deve ignorar endpoints de auth', async () => {
    tokenStorage.getToken.mockReturnValue('token');
    const req = new HttpRequest('GET', '/api/auth/login');
    const next = jest.fn(() => of(new HttpResponse({ status: 200 })));

    await firstValueFrom(runInterceptor(req, next));

    expect(next).toHaveBeenCalledWith(req);
    expect(authService.revalidateToken).not.toHaveBeenCalled();
  });

  it('deve seguir sem alterar request quando nao houver token', async () => {
    tokenStorage.getToken.mockReturnValue(null);
    const req = new HttpRequest('GET', '/api/data');
    const next = jest.fn(() => of(new HttpResponse({ status: 200 })));

    await firstValueFrom(runInterceptor(req, next));

    expect(next).toHaveBeenCalledWith(req);
  });

  it('deve anexar Authorization quando token nao esta perto de expirar', async () => {
    tokenStorage.getToken.mockReturnValue('token');
    tokenStorage.willExpireIn.mockReturnValue(false);
    const req = new HttpRequest('GET', '/api/data');
    const next = jest.fn((forwarded: HttpRequest<unknown>) => {
      expect(forwarded.headers.get('Authorization')).toBe('Bearer token');
      return of(new HttpResponse({ status: 200 }));
    });

    await firstValueFrom(runInterceptor(req, next));

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve limpar token e navegar para login quando request autenticado retorna 401', async () => {
    tokenStorage.getToken.mockReturnValue('token');
    tokenStorage.willExpireIn.mockReturnValue(false);
    const req = new HttpRequest('GET', '/api/data');
    const error = new HttpErrorResponse({ status: 401 });
    const next = jest.fn(() => throwError(() => error));

    await expect(firstValueFrom(runInterceptor(req, next))).rejects.toBe(error);

    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('nao deve limpar token para erro diferente de 401/403', async () => {
    tokenStorage.getToken.mockReturnValue('token');
    tokenStorage.willExpireIn.mockReturnValue(false);
    const req = new HttpRequest('GET', '/api/data');
    const error = new HttpErrorResponse({ status: 500 });
    const next = jest.fn(() => throwError(() => error));

    await expect(firstValueFrom(runInterceptor(req, next))).rejects.toBe(error);

    expect(tokenStorage.clear).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deve revalidar token e enviar request com token novo', async () => {
    tokenStorage.getToken.mockReturnValue('old-token');
    tokenStorage.willExpireIn.mockReturnValue(true);
    authService.revalidateToken.mockReturnValue(of({ token: 'new-token' }));
    const req = new HttpRequest('GET', '/api/data');
    const next = jest.fn((forwarded: HttpRequest<unknown>) => {
      expect(forwarded.headers.get('Authorization')).toBe('Bearer new-token');
      return of(new HttpResponse({ status: 200 }));
    });

    await firstValueFrom(runInterceptor(req, next));

    expect(authService.revalidateToken).toHaveBeenCalledWith('old-token');
    expect(tokenStorage.setToken).toHaveBeenCalledWith('new-token');
  });

  it('deve falhar, limpar e navegar quando revalidacao nao retorna token', async () => {
    tokenStorage.getToken.mockReturnValue('old-token');
    tokenStorage.willExpireIn.mockReturnValue(true);
    authService.revalidateToken.mockReturnValue(of({ token: '' }));
    const req = new HttpRequest('GET', '/api/data');
    const next = jest.fn();

    await expect(firstValueFrom(runInterceptor(req, next))).rejects.toThrow('Token inválido na revalidação');

    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve limpar e navegar quando revalidacao retorna erro', async () => {
    tokenStorage.getToken.mockReturnValue('old-token');
    tokenStorage.willExpireIn.mockReturnValue(true);
    const error = new Error('falha');
    authService.revalidateToken.mockReturnValue(throwError(() => error));
    const req = new HttpRequest('GET', '/api/data');

    await expect(firstValueFrom(runInterceptor(req, jest.fn()))).rejects.toBe(error);

    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('deve seguir com token atual enquanto outra revalidacao esta em andamento', async () => {
    tokenStorage.getToken.mockReturnValue('old-token');
    tokenStorage.willExpireIn.mockReturnValue(true);
    const refresh$ = new Subject<{ token: string }>();
    authService.revalidateToken.mockReturnValue(refresh$);

    const firstReq = new HttpRequest('GET', '/api/first');
    const firstNext = jest.fn(() => of(new HttpResponse({ status: 200 })));
    const firstSub = runInterceptor(firstReq, firstNext).subscribe();

    const secondReq = new HttpRequest('GET', '/api/second');
    const secondNext = jest.fn((forwarded: HttpRequest<unknown>) => {
      expect(forwarded.headers.get('Authorization')).toBe('Bearer old-token');
      return of(new HttpResponse({ status: 200 }));
    });

    await firstValueFrom(runInterceptor(secondReq, secondNext));

    refresh$.next({ token: 'new-token' });
    refresh$.complete();
    firstSub.unsubscribe();

    expect(secondNext).toHaveBeenCalledTimes(1);
  });
});

function runInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn | jest.Mock<Observable<HttpEvent<unknown>>, any>
) {
  return TestBed.runInInjectionContext(() => tokenInterceptor(req, next as HttpHandlerFn));
}
