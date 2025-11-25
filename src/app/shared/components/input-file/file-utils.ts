import { ungzip } from 'pako';

  export type HashMode = 'binary' | 'base64';

  export interface ProcessedSnapshot {
    filename: string;           // ex: "planilha_201901.csv"
    mimeType?: string;          // ex: "text/csv"
    sizeBytes: number;          // tamanho original (informativo)
    gzipSizeBytes: number;      // tamanho gzip (informativo)
    base64Gzip: string;         // CONTEÚDO gzip em Base64 (sem prefixo data:)
    hashMode: HashMode;         // 'binary' (do gzip) ou 'base64' (da string base64)
    hashSha256Hex: string;      // para validação opcional
  }

  /** Base64 -> Uint8Array (rápido e robusto para strings grandes) */
  export function base64ToUint8(b64: string): Uint8Array {
    if (!b64 || typeof b64 !== 'string') return new Uint8Array();
    // Converte Base64URL para Base64 padrão
    let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    // Remove caracteres não permitidos
    base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    // Adiciona '=' até que o comprimento seja múltiplo de 4
    while (base64.length % 4 !== 0) base64 += '=';
    try {
      const bin = atob(base64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
      return out;
    } catch (err) {
      console.error('base64ToUint8: invalid base64 string', err);
      return new Uint8Array();
    }
  }
  /** SHA-256 (hex) de BufferSource (TypedArray ou ArrayBuffer) */
  export async function sha256Hex(buf: BufferSource): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
    const arr = new Uint8Array(hashBuffer);
    let hex = '';
    for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, '0');
    return hex;
  }
  /** SHA-256 (hex) de string (UTF-8) */
  export async function sha256HexOfString(s: string): Promise<string> {
    const enc = new TextEncoder().encode(s);
    return sha256Hex(enc);
  }
  // helper minúsculo (cole acima do gunzip)
  export function toArrayBuffer(view: ArrayBufferView): ArrayBuffer {
    const { buffer, byteOffset, byteLength } = view;
    if (buffer instanceof ArrayBuffer) {
      // recorta exatamente o segmento visível do view (sem copiar dados)
      return buffer.slice(byteOffset, byteOffset + byteLength);
    }
    // SharedArrayBuffer ou ArrayBufferLike -> copia para AB real
    const ab = new ArrayBuffer(byteLength);
    new Uint8Array(ab).set(new Uint8Array(buffer, byteOffset, byteLength));
    return ab;
  }
  /** Descomprime gzip -> Uint8Array do conteúdo original (usa DecompressionStream se houver, senão pako) */
  export async function gunzip(u8Gzip: Uint8Array): Promise<Uint8Array> {
    if ('DecompressionStream' in globalThis) {
      const ds = new (globalThis as any).DecompressionStream('gzip');
      //FIX: normaliza para ArrayBuffer real antes do Response(...)
      const ab = toArrayBuffer(u8Gzip);
      const rs = (new Response(ab)).body!;  // ReadableStream<Uint8Array>
      const stream = rs.pipeThrough(ds as TransformStream<Uint8Array, Uint8Array>);
      const out = await new Response(stream).arrayBuffer();
      return new Uint8Array(out);
    }
    // fallback estável
    return ungzip(u8Gzip);
  }
  /** Cria um File e dispara download */
  export function downloadFile(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
  /**
   * Restaura arquivos (gz e o original) a partir do snapshot processado.
   * Faz validação de hash (opcional via flag).
   */
  export async function restoreFilesFromSnapshot(snap: any, validateHash = true): Promise<{ gzipFile: File; originalFile: File; hashOk: boolean }> {
    if (!snap) throw new Error('Snapshot inválido');
    // Seleciona a string base64: prioriza base64Gzip, senão base64Payload
    const b64: string | undefined = snap.base64Gzip ?? snap.base64Payload;
    if (!b64) throw new Error('Snapshot sem dados base64');
    // Converte a string base64 em bytes
    const u8Raw = base64ToUint8(b64);
    // Determina o tipo de codificação: usa contentEncoding ou infere a partir da presença de base64Gzip
    const encoding: string = snap.contentEncoding || (snap.base64Gzip ? 'gzip' : 'identity');
    const isGzip = encoding.toLowerCase() === 'gzip';
    // Descompressão opcional
    let u8OriginalRaw: Uint8Array;
    if (isGzip) {
      try {
        u8OriginalRaw = await gunzip(u8Raw);
      } catch (err) {
        // Caso a descompressão falhe, registra o erro e prossegue com os bytes brutos
        console.error('gunzip failed, returning raw bytes', err);
        u8OriginalRaw = u8Raw;
      }
    } else {
      u8OriginalRaw = u8Raw;
    }
    // Validação de hash, se solicitado (compara com hashSha256Hex ou sha256Hex)
    let hashOk = true;
    if (validateHash) {
      const snapHash: string | undefined = snap.hashSha256Hex ?? snap.sha256Hex;
      if (snapHash) {
        const h = await sha256Hex(toArrayBuffer(u8OriginalRaw));
        hashOk = h === snapHash;
      }
    }
    // Cria o arquivo gzip (sempre a partir dos bytes brutos)
    const abRaw = toArrayBuffer(u8Raw);
    const gzipFile = new File([abRaw], `${snap.filename || 'file'}.gz`, { type: 'application/gzip' });
    // Cria o arquivo original a partir dos bytes descomprimidos
    const abOriginal = toArrayBuffer(u8OriginalRaw);
    const originalFile = new File([abOriginal], snap.filename || 'file', {
      type: snap.mimeType || 'application/octet-stream'
    });
    return { gzipFile, originalFile, hashOk };
  }