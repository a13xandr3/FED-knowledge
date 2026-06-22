import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let tokenStorage: { setToken: jest.Mock; clear: jest.Mock; getToken: jest.Mock };

  beforeEach(() => {
    tokenStorage = {
      setToken: jest.fn(),
      clear: jest.fn(),
      getToken: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TokenStorageService, useValue: tokenStorage },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve autenticar e armazenar token quando resposta possuir token', () => {
    const payload = { username: 'user', password: 'pass', totp: '123456' };

    service.login(payload).subscribe(response => {
      expect(response).toEqual({ status: 'ok', token: 'abc' });
    });

    const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ status: 'ok', token: 'abc' });

    expect(tokenStorage.setToken).toHaveBeenCalledWith('abc');
  });

  it('nao deve armazenar token quando resposta nao possuir token', () => {
    const payload = { username: 'user', password: 'pass', totp: '123456' };

    service.login(payload).subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/auth/login');
    req.flush({ status: 'ok' });

    expect(tokenStorage.setToken).not.toHaveBeenCalled();
  });

  it('deve revalidar token e armazenar token novo quando existir', () => {
    service.revalidateToken('old-token').subscribe(response => {
      expect(response).toEqual({ status: 'ok', token: 'new-token' });
    });

    const req = httpMock.expectOne('http://localhost:8080/api/auth/revalidate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'old-token' });
    req.flush({ status: 'ok', token: 'new-token' });

    expect(tokenStorage.setToken).toHaveBeenCalledWith('new-token');
  });

  it('nao deve armazenar token ao revalidar quando resposta nao possuir token', () => {
    service.revalidateToken('old-token').subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/auth/revalidate');
    req.flush({ status: 'ok' });

    expect(tokenStorage.setToken).not.toHaveBeenCalled();
  });

  it('deve delegar logout e getToken ao TokenStorageService', () => {
    tokenStorage.getToken.mockReturnValue('stored-token');

    service.logout();

    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(service.getToken()).toBe('stored-token');
  });
});
