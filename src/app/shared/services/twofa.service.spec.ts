import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TwofaService } from './twofa.service';

describe('TwofaService', () => {
  let service: TwofaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(TwofaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve enviar email e codigo para verificacao 2FA', () => {
    service.verify('user@email.com', '123456').subscribe(response => {
      expect(response).toEqual({ valid: true });
    });

    const req = httpMock.expectOne('/api/auth/2fa/verify');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@email.com', code: '123456' });
    req.flush({ valid: true });
  });
});
