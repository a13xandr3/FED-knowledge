import { base64ToUint8, downloadFile, gunzip, sha256Hex, sha256HexOfString, toArrayBuffer, restoreFilesFromSnapshot, ProcessedSnapshot } from './file-utils';
import { gzip } from 'pako';

// Helper to convert Uint8Array to base64 string without data URI prefix
function u8ToBase64(u8: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}

describe('file-utils', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('base64ToUint8 should decode base64 into correct bytes', () => {
    const b64 = btoa('Hello');
    const bytes = base64ToUint8(b64);
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
    expect(Array.from(base64ToUint8('SGVsbG8'))).toEqual([72, 101, 108, 108, 111]);
    expect(base64ToUint8('').length).toBe(0);
    expect(base64ToUint8(null as unknown as string).length).toBe(0);
  });

  it('base64ToUint8 deve retornar vazio para base64 invalido', () => {
    const originalAtob = globalThis.atob;
    jest.spyOn(globalThis, 'atob').mockImplementation(() => {
      throw new Error('invalid');
    });

    expect(base64ToUint8('@@@').length).toBe(0);

    globalThis.atob = originalAtob;
  });

  it('sha256Hex should hash a BufferSource correctly', async () => {
    const msg = new TextEncoder().encode('abc');
    const hash = await sha256Hex(msg);
    // expected SHA‑256 of "abc"
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('sha256HexOfString should hash a string correctly', async () => {
    const hash = await sha256HexOfString('abc');
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('toArrayBuffer should return a pure ArrayBuffer from a TypedArray', () => {
    const u8 = new Uint8Array([1, 2, 3, 4]);
    const ab = toArrayBuffer(u8);
    expect(ab.byteLength).toBe(4);
    // underlying ArrayBuffer of u8 is of length 4 as well but we want a new view
    const out = new Uint8Array(ab);
    expect(Array.from(out)).toEqual([1, 2, 3, 4]);
  });

  it('toArrayBuffer deve copiar SharedArrayBuffer quando disponivel', () => {
    if (typeof SharedArrayBuffer === 'undefined') {
      expect(true).toBe(true);
      return;
    }

    const shared = new SharedArrayBuffer(2);
    const view = new Uint8Array(shared);
    view.set([1, 2]);

    expect(Array.from(new Uint8Array(toArrayBuffer(view)))).toEqual([1, 2]);
  });

  it('gunzip deve restaurar conteudo gzip', async () => {
    const gz = gzip(new TextEncoder().encode('gzip'));

    await expect(gunzip(gz)).resolves.toEqual(new TextEncoder().encode('gzip'));
  });

  it('gunzip deve usar DecompressionStream quando disponivel', async () => {
    const original = (globalThis as any).DecompressionStream;
    const OriginalResponse = globalThis.Response;
    const pipeThrough = jest.fn(() => 'stream');

    try {
      (globalThis as any).DecompressionStream = class {
        constructor(format: string) {
          expect(format).toBe('gzip');
        }
      };
      globalThis.Response = class {
        body = { pipeThrough };
        constructor(readonly input?: unknown) {}
        arrayBuffer(): Promise<ArrayBuffer> {
          return Promise.resolve(new Uint8Array([1, 2]).buffer);
        }
      } as unknown as typeof Response;

      await expect(gunzip(new Uint8Array([1, 2]))).resolves.toEqual(new Uint8Array([1, 2]));
      expect(pipeThrough).toHaveBeenCalled();
    } finally {
      globalThis.Response = OriginalResponse;
      if (original) {
        (globalThis as any).DecompressionStream = original;
      } else {
        delete (globalThis as any).DecompressionStream;
      }
    }
  });

  it('downloadFile deve criar anchor e revogar URL', () => {
    const click = jest.fn();
    const anchor = { href: '', download: '', click };
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:file'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file');
    jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    jest.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement);

    const file = new File(['abc'], 'a.txt');
    downloadFile(file);

    expect(anchor.href).toBe('blob:file');
    expect(anchor.download).toBe('a.txt');
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:file');
  });

  it('restoreFilesFromSnapshot should reconstruct original and gzip files and validate hash', async () => {
    const text = 'Test content';
    const encoder = new TextEncoder();
    const u8 = encoder.encode(text);
    const gz = gzip(u8); // returns Uint8Array
    const base64Gzip = u8ToBase64(gz);
    const hash = await sha256HexOfString(base64Gzip);
    const snap: ProcessedSnapshot = {
      filename: 'test.txt',
      mimeType: 'text/plain',
      sizeBytes: u8.length,
      gzipSizeBytes: gz.length,
      base64Gzip,
      hashMode: 'base64',
      hashSha256Hex: hash
    };
    const { gzipFile, originalFile, hashOk } = await restoreFilesFromSnapshot(snap, true);
    expect(hashOk).toBeTruthy();
    // Check filenames
    expect(gzipFile.name).toBe('test.txt.gz');
    expect(originalFile.name).toBe('test.txt');
    // Check content by reading original file's text
    const restoredText = await fileToText(originalFile);
    expect(restoredText).toBe(text);
  });

  it('restoreFilesFromSnapshot deve restaurar payload identity e validar hash binario', async () => {
    const raw = new TextEncoder().encode('raw');
    const b64 = u8ToBase64(raw);
    const hash = await sha256Hex(raw);

    const { originalFile, gzipFile, hashOk } = await restoreFilesFromSnapshot({
      filename: '',
      mimeType: '',
      base64Payload: b64,
      contentEncoding: 'identity',
      hashMode: 'binary',
      sha256Hex: hash,
    }, true);

    expect(hashOk).toBe(true);
    expect(originalFile.name).toBe('file');
    expect(originalFile.type).toBe('application/octet-stream');
    expect(gzipFile.name).toBe('file.gz');
    expect(await fileToText(originalFile)).toBe('raw');
  });

  it('restoreFilesFromSnapshot deve inferir identity quando contentEncoding estiver ausente', async () => {
    const raw = new TextEncoder().encode('raw');

    const { originalFile } = await restoreFilesFromSnapshot({
      filename: 'raw.txt',
      base64Payload: u8ToBase64(raw),
    }, false);

    expect(await fileToText(originalFile)).toBe('raw');
  });

  it('restoreFilesFromSnapshot deve tratar hash divergente, validacao desligada e entradas invalidas', async () => {
    const raw = new TextEncoder().encode('raw');
    const b64 = u8ToBase64(raw);

    await expect(restoreFilesFromSnapshot(null)).rejects.toThrow('Snapshot inválido');
    await expect(restoreFilesFromSnapshot({ filename: 'x' })).rejects.toThrow('Snapshot sem dados base64');

    await expect(restoreFilesFromSnapshot({
      filename: 'raw.txt',
      base64Payload: b64,
      contentEncoding: 'identity',
      hashSha256Hex: 'hash-incorreto',
    }, true)).resolves.toEqual(expect.objectContaining({ hashOk: false }));

    await expect(restoreFilesFromSnapshot({
      filename: 'raw.txt',
      base64Payload: b64,
      contentEncoding: 'identity',
    }, false)).resolves.toEqual(expect.objectContaining({ hashOk: true }));
  });

  it('restoreFilesFromSnapshot deve seguir com bytes brutos quando gunzip falhar', async () => {
    const raw = new TextEncoder().encode('nao-gzip');

    const { originalFile, hashOk } = await restoreFilesFromSnapshot({
      filename: 'raw.txt',
      base64Gzip: u8ToBase64(raw),
      contentEncoding: 'gzip',
    }, true);

    expect(hashOk).toBe(true);
    expect(await fileToText(originalFile)).toBe('nao-gzip');
  });
});
