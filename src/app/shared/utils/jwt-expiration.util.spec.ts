import { readJwtExpSeconds } from './jwt-expiration.util';

function createJwt(payload: object): string {
  const base64Url = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `header.${base64Url}.signature`;
}

describe('jwt-expiration.util', () => {
  it('deve ler exp numerico do payload JWT', () => {
    expect(readJwtExpSeconds(createJwt({ exp: 123 }))).toBe(123);
  });

  it('deve retornar null quando JWT nao tem payload', () => {
    expect(readJwtExpSeconds('token-invalido')).toBeNull();
  });

  it('deve retornar null quando exp nao e numerico', () => {
    expect(readJwtExpSeconds(createJwt({ exp: '123' }))).toBeNull();
  });

  it('deve retornar null quando payload nao e JSON valido', () => {
    expect(readJwtExpSeconds('header.payload.signature')).toBeNull();
  });
});
