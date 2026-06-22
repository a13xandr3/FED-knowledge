import { TestBed } from '@angular/core/testing';

import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve gerar hash SHA-256 em hexadecimal', async () => {
    await expect(service.cryptoHashPassword('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('deve criptografar e descriptografar texto com chave informada', async () => {
    const encrypted = await service.encryptData('segredo', 'minha-chave');

    expect(encrypted).toContain('cipher');
    await expect(service.decryptData(encrypted, 'minha-chave')).resolves.toBe('segredo');
  });

  it('deve retornar null ao descriptografar payload invalido', async () => {
    await expect(service.decryptData('json-invalido', 'chave')).resolves.toBeNull();
  });

  it('deve criptografar e descriptografar token com chave mestre', async () => {
    const encrypted = await service.cryptoToken('token');

    await expect(service.decryptToken(encrypted)).resolves.toBe('token');
  });

  it('deve criptografar e descriptografar credenciais', async () => {
    const encrypted = await service.cryptoCreds('usuario', 'senha');

    await expect(service.decryptCreds(encrypted)).resolves.toEqual({
      username: 'usuario',
      password: 'senha',
    });
  });

  it('deve retornar null quando credenciais nao puderem ser descriptografadas', async () => {
    await expect(service.decryptCreds('payload-invalido')).resolves.toBeNull();
  });
});
