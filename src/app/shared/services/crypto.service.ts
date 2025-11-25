import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class CryptoService {
  
  /**
   * Serviço de Criptografia seguro utilizando Web Crypto API.
   * Fornece criptografia AES-GCM 256 bits e hash SHA-256.
   */

  private readonly salt = new TextEncoder().encode('angular-knowledge-salt'); // sal fixo (ou dinâmico)
  private readonly ivLength = 12; // recomendação AES-GCM: 96 bits = 12 bytes

  constructor() {}

  /** ===================================
   * GERAÇÃO E DERIVAÇÃO DE CHAVE AES-256
   * ==================================== */
  private async deriveKey(secretKey: string): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secretKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /** ============================
   * FUNÇÃO DE HASH (SHA-256)
   * ============================ */
  async cryptoHashPassword(password: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** ============================
   * CRIPTOGRAFIA AES-GCM
   * ============================ */
  async encryptData(plainText: string, secretKey: string): Promise<string> {
    const key = await this.deriveKey(secretKey);
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
    const encoded = new TextEncoder().encode(plainText);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Concatena IV + CIPHER (em Base64)
    const cipherArray = new Uint8Array(cipherBuffer);
    const result = {
      iv: btoa(String.fromCharCode(...iv)),
      cipher: btoa(String.fromCharCode(...cipherArray))
    };
    return JSON.stringify(result);
  }

  /** ============================
   * DESCRIPTOGRAFIA AES-GCM
   * ============================ */
  async decryptData(encryptedJson: string, secretKey: string): Promise<string | null> {
    try {
      const { iv, cipher } = JSON.parse(encryptedJson);
      const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
      const cipherBytes = Uint8Array.from(atob(cipher), c => c.charCodeAt(0));

      const key = await this.deriveKey(secretKey);
      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        cipherBytes
      );

      return new TextDecoder().decode(plainBuffer);
    } catch {
      return null;
    }
  }

  /** ============================
   * TOKEN
   * ============================ */
  async cryptoToken(token: string): Promise<string> {
    return this.encryptData(token, this.getMasterKey());
  }

  async decryptToken(cipherToken: string): Promise<string | null> {
    return this.decryptData(cipherToken, this.getMasterKey());
  }

  /** ============================
   * CREDENCIAIS
   * ============================ */
  async cryptoCreds(username: string, password: string): Promise<string> {
    const creds = `${username}:${btoa(password)}`;
    return this.encryptData(creds, this.getMasterKey());
  }

  async decryptCreds(cipherCreds: string): Promise<{ username: string; password: string } | null> {
    const decrypted = await this.decryptData(cipherCreds, this.getMasterKey());
    if (!decrypted) return null;

    const [username, passwordBase64] = decrypted.split(':');
    return { username, password: atob(passwordBase64) };
  }

  /** ============================
   * CHAVE MESTRA FIXA / CONFIGURÁVEL
   * ============================ */
  private getMasterKey(): string {
    // Essa chave pode vir de uma variável de ambiente, backend, etc.
    return '8b5c3f6d9a247c8b2a74e998f0b6719d7e2f1c3e8a9b4f7d8a1d3c5e6f2a9b8e';
  }
}