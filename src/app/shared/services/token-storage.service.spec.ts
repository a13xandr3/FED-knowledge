import { TestBed } from '@angular/core/testing';

import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
    localStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve salvar, recuperar e limpar token', () => {
    service.setToken('token');

    expect(service.getToken()).toBe('token');

    service.clear();

    expect(service.getToken()).toBeNull();
  });

  it('deve retornar null para data de expiracao quando token nao existe ou e invalido', () => {
    expect(service.getExpirationDate()).toBeNull();

    service.setToken('token-invalido');

    expect(service.getExpirationDate()).toBeNull();

    service.setToken('header.payload.signature');

    expect(service.getExpirationDate()).toBeNull();
  });

  it('deve decodificar data de expiracao de JWT valido', () => {
    service.setToken(createJwt({ exp: 1_767_312_000 }));

    expect(service.getExpirationDate()?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('deve considerar expirado quando nao ha exp ou quando exp ja passou', () => {
    expect(service.isTokenExpired()).toBe(true);

    service.setToken(createJwt({ exp: 1_767_225_599 }));

    expect(service.isTokenExpired()).toBe(true);
  });

  it('deve identificar token valido e janela de expiracao', () => {
    service.setToken(createJwt({ exp: 1_767_225_660 }));

    expect(service.isTokenExpired()).toBe(false);
    expect(service.willExpireIn(60)).toBe(true);
    expect(service.willExpireIn(10)).toBe(false);
  });

  it('deve considerar que token sem expiracao vai expirar', () => {
    expect(service.willExpireIn(60)).toBe(true);
  });
});

function createJwt(payload: object): string {
  const base64Url = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `header.${base64Url}.signature`;
}
