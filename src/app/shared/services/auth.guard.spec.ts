import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Observable, firstValueFrom, isObservable, of, throwError } from 'rxjs';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthGuard', () => {
  const tokenStorageServiceMock = {
    getToken: jest.fn(),
    isTokenExpired: jest.fn(),
    willExpireIn: jest.fn(),
    clear: jest.fn(),
  };

  const authServiceMock = {
    isAuthenticated: jest.fn(),
    getToken: jest.fn(),
    revalidateToken: jest.fn(),
  };

  const loginTree = {} as UrlTree;
  const routerMock = {
    createUrlTree: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routerMock.createUrlTree.mockReturnValue(loginTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: TokenStorageService, useValue: tokenStorageServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('deve permitir acesso quando o token estiver válido e longe de expirar', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.getToken.mockReturnValue('token');
    tokenStorageServiceMock.willExpireIn.mockReturnValue(false);

    const result = await runGuard();

    expect(result).toBe(true);
    expect(authServiceMock.isAuthenticated).toHaveBeenCalled();
    expect(authServiceMock.revalidateToken).not.toHaveBeenCalled();
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });

  it('deve bloquear acesso e criar redirect para login quando nao houver token', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = await runGuard();

    expect(result).toBe(loginTree);
    expect(authServiceMock.isAuthenticated).toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('deve bloquear acesso e criar redirect para login quando o token estiver expirado', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = await runGuard();

    expect(result).toBe(loginTree);
    expect(authServiceMock.isAuthenticated).toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('deve redirecionar para login quando sessao diz ativa mas token nao existe', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.getToken.mockReturnValue(null);

    const result = await runGuard();

    expect(result).toBe(loginTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('deve revalidar token quando estiver perto de expirar', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.getToken.mockReturnValue('old-token');
    tokenStorageServiceMock.willExpireIn.mockReturnValue(true);
    authServiceMock.revalidateToken.mockReturnValue(of({ status: 'ok', token: 'new-token' }));

    const result = await runGuard();

    expect(result).toBe(true);
    expect(authServiceMock.revalidateToken).toHaveBeenCalledWith('old-token');
  });

  it('deve redirecionar para login quando revalidacao nao retorna token', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.getToken.mockReturnValue('old-token');
    tokenStorageServiceMock.willExpireIn.mockReturnValue(true);
    authServiceMock.revalidateToken.mockReturnValue(of({ status: 'ok', token: '' }));

    const result = await runGuard();

    expect(result).toBe(loginTree);
    expect(tokenStorageServiceMock.clear).toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('deve redirecionar para login quando revalidacao falhar', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.getToken.mockReturnValue('old-token');
    tokenStorageServiceMock.willExpireIn.mockReturnValue(true);
    authServiceMock.revalidateToken.mockReturnValue(throwError(() => new Error('falha')));

    const result = await runGuard();

    expect(result).toBe(loginTree);
    expect(tokenStorageServiceMock.clear).toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});

async function runGuard(): Promise<unknown> {
  const result = TestBed.runInInjectionContext(() => AuthGuard({} as any, {} as any));
  return isObservable(result)
    ? firstValueFrom(result as Observable<unknown>)
    : result;
}
