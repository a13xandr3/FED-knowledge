import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthGuard } from './auth.guard';
import { TokenStorageService } from './token-storage.service';

describe('AuthGuard', () => {
  const tokenStorageServiceMock = {
    isTokenExpired: jest.fn(),
  };

  const routerMock = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: TokenStorageService, useValue: tokenStorageServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('deve permitir acesso quando o token estiver válido', () => {
    tokenStorageServiceMock.isTokenExpired.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => AuthGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('deve bloquear acesso e navegar para login quando o token estiver expirado', () => {
    tokenStorageServiceMock.isTokenExpired.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => AuthGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });
});
