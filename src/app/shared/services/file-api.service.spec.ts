import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { gzip } from 'pako';

import { FileApiService } from './file-api.service';
import { ProcessedFile } from '../request/request';

describe('FileApiService', () => {
  let service: FileApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FileApiService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve enviar upload, delete, snapshot e download com headers de autenticacao', () => {
    localStorage.setItem('kb_token', 'token');
    const form = new FormData();

    service.upload(form).subscribe(response => expect(response).toEqual([{ id: 1, hashSha256Hex: 'hash' }]));
    const uploadReq = httpMock.expectOne('http://localhost:8080/api/files');
    expect(uploadReq.request.method).toBe('POST');
    expect(uploadReq.request.headers.get('Authorization')).toBe('Bearer token');
    uploadReq.flush([{ id: 1, hashSha256Hex: 'hash' }]);

    service.delete(1).subscribe(response => expect(response).toEqual([{ id: 1, hashSha256Hex: 'hash' }]));
    const deleteReq = httpMock.expectOne('http://localhost:8080/api/files/delete/1');
    expect(deleteReq.request.method).toBe('DELETE');
    expect(deleteReq.request.headers.get('Authorization')).toBe('Bearer token');
    deleteReq.flush([{ id: 1, hashSha256Hex: 'hash' }]);

    service.getSnapshot(1, true).subscribe(response => expect(response.id).toBe(1));
    const snapshotReq = httpMock.expectOne('http://localhost:8080/api/files/1?includeBase64=true');
    expect(snapshotReq.request.method).toBe('GET');
    snapshotReq.flush(snapshotResponse(1, 'a.txt', 'text/plain'));

    service.getSnapshot(9).subscribe(response => expect(response.id).toBe(9));
    const defaultSnapshotReq = httpMock.expectOne('http://localhost:8080/api/files/9?includeBase64=false');
    expect(defaultSnapshotReq.request.method).toBe('GET');
    defaultSnapshotReq.flush(snapshotResponse(9, 'default.txt', 'text/plain'));

    service.download(1).subscribe(response => expect(response).toBeInstanceOf(Blob));
    const downloadReq = httpMock.expectOne('http://localhost:8080/api/files/1/download');
    expect(downloadReq.request.method).toBe('GET');
    expect(downloadReq.request.responseType).toBe('blob');
    downloadReq.flush(new Blob(['abc'], { type: 'text/plain' }));
  });

  it('deve montar FormData e enviar uploadOne', () => {
    const payload = processedFile({
      mimeType: 'text/plain',
      contentEncoding: 'identity',
      gzipSizeBytes: 10,
    });

    service.uploadOne(payload).subscribe(response => {
      expect(response).toEqual({ id: 99, hashSha256Hex: 'hash' });
    });

    const req = httpMock.expectOne('http://localhost:8080/api/files');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('contentEncoding')).toBe('identity');
    expect(body.get('hashSha256Hex')).toBe('hash');
    expect(body.get('originalSizeBytes')).toBe('3');
    expect(body.get('gzipSizeBytes')).toBe('10');
    expect(body.get('mimeType')).toBe('text/plain');
    expect(body.get('filename')).toBe('a.txt');
    expect(body.get('file')).toBeInstanceOf(Blob);
    req.flush({ id: 99, hashSha256Hex: 'hash' });
  });

  it('deve montar FormData gzip sem campos opcionais ausentes', () => {
    service.uploadOne(processedFile({
      mimeType: undefined,
      contentEncoding: 'gzip',
      gzipSizeBytes: undefined,
      filename: '',
    })).subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/files');
    const body = req.request.body as FormData;
    expect((body.get('file') as Blob).type).toBe('application/gzip');
    expect(body.has('gzipSizeBytes')).toBe(false);
    expect(body.has('mimeType')).toBe(false);
    expect(body.has('filename')).toBe(false);
    req.flush({ id: 1, hashSha256Hex: 'hash' });
  });

  it('deve usar application/octet-stream quando identity nao tiver mimeType', () => {
    service.uploadOne(processedFile({
      mimeType: undefined,
      contentEncoding: 'identity',
    })).subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/files');
    const body = req.request.body as FormData;
    expect((body.get('file') as Blob).type).toBe('application/octet-stream');
    req.flush({ id: 1, hashSha256Hex: 'hash' });
  });

  it('deve converter payload identity e gzip para File', async () => {
    const identity = await service.payloadToFile({
      payloadBytes: new TextEncoder().encode('abc'),
      contentEncoding: 'identity',
      filename: 'a.txt',
      mimeType: 'text/plain',
    });

    expect(identity.name).toBe('a.txt');
    expect(identity.type).toBe('text/plain');
    expect(await readFileText(identity)).toBe('abc');

    const gz = gzip(new TextEncoder().encode('zipado'));
    const restored = await service.payloadToFile({
      payloadBytes: gz,
      contentEncoding: 'gzip',
      filename: 'b.bin',
    });

    expect(restored.type).toBe('application/octet-stream');
    expect(await readFileText(restored)).toBe('zipado');
  });

  it('deve gerar e revogar object URLs', () => {
    const file = new File(['abc'], 'a.txt');

    expect(service.fileToObjectUrl(file)).toBe('blob:preview');
    service.revokeObjectUrl('blob:preview');
    service.revokeObjectUrl(null);

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('deve construir previews a partir de ids validos', async () => {
    const promise = service.buildPreviewsFromFileIds([{ fileId: 1 }, 2, 'x']);

    const snapOne = httpMock.expectOne('http://localhost:8080/api/files/1?includeBase64=false');
    const snapTwo = httpMock.expectOne('http://localhost:8080/api/files/2?includeBase64=false');
    snapOne.flush(snapshotResponse(1, 'foto-sem-mime.png', ''));
    snapTwo.flush(snapshotResponse(2, 'documento.pdf', 'application/pdf'));
    await Promise.resolve();

    const downOne = httpMock.expectOne('http://localhost:8080/api/files/1/download');
    const downTwo = httpMock.expectOne('http://localhost:8080/api/files/2/download');
    downOne.flush(new Blob(['img'], { type: '' }));
    downTwo.flush(new Blob(['pdf'], { type: 'application/pdf' }));

    await expect(promise).resolves.toEqual([
      { url: 'blob:preview', filename: 'foto-sem-mime.png', mimeType: 'image/png', sizeBytes: 3, id: 1 },
      { url: '', filename: 'documento.pdf', mimeType: 'application/pdf', sizeBytes: 3, id: 2 },
    ]);
  });

  it('deve construir preview com filename e mime fallback', async () => {
    const promise = service.buildPreviewsFromFileIds([{ id: 3 }, { file_id: 4 }, { fileID: 5 }]);

    httpMock.expectOne('http://localhost:8080/api/files/3?includeBase64=false')
      .flush({ ...snapshotResponse(3, '', ''), filename: '', mimeType: '' });
    httpMock.expectOne('http://localhost:8080/api/files/4?includeBase64=false')
      .flush(snapshotResponse(4, 'sem-mime.bin', ''));
    httpMock.expectOne('http://localhost:8080/api/files/5?includeBase64=false')
      .flush(snapshotResponse(5, 'foto.jpg', ''));
    await Promise.resolve();

    httpMock.expectOne('http://localhost:8080/api/files/3/download')
      .flush(new Blob(['bin'], { type: '' }));
    httpMock.expectOne('http://localhost:8080/api/files/4/download')
      .flush(new Blob(['bin'], { type: 'application/custom' }));
    httpMock.expectOne('http://localhost:8080/api/files/5/download')
      .flush(new Blob(['img'], { type: '' }));

    await expect(promise).resolves.toEqual([
      { url: '', filename: 'file-3', mimeType: 'application/octet-stream', sizeBytes: 3, id: 3 },
      { url: '', filename: 'sem-mime.bin', mimeType: 'application/custom', sizeBytes: 3, id: 4 },
      { url: 'blob:preview', filename: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 3, id: 5 },
    ]);
  });

  it('deve retornar lista vazia quando nao houver ids numericos', async () => {
    await expect(service.buildPreviewsFromFileIds(['x'])).resolves.toEqual([]);
    await expect(service.buildPreviewsFromFileIds(null as unknown as readonly unknown[])).resolves.toEqual([]);
  });

  it('deve cobrir copia de SharedArrayBuffer em ArrayBuffer puro quando disponivel', () => {
    if (typeof SharedArrayBuffer === 'undefined') {
      expect(true).toBe(true);
      return;
    }

    const shared = new SharedArrayBuffer(2);
    const view = new Uint8Array(shared);
    view.set([1, 2]);

    const result = (service as unknown as { toPureArrayBuffer(u8: Uint8Array): ArrayBuffer })
      .toPureArrayBuffer(view);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(result))).toEqual([1, 2]);
  });

  it('deve identificar imagens por mime ou extensao conhecida', () => {
    const api = service as unknown as {
      isImageLike(mimeFromHdr: string | undefined, filename?: string | null): { ok: boolean; finalMime?: string };
      guessImageMimeByExt(filename?: string | null): string | null;
    };

    expect(api.isImageLike('image/jpeg')).toEqual({ ok: true, finalMime: 'image/jpeg' });
    expect(api.isImageLike('', 'a.jpg')).toEqual({ ok: true, finalMime: 'image/jpeg' });
    expect(api.guessImageMimeByExt('a.webp')).toBe('image/webp');
    expect(api.guessImageMimeByExt('a.gif')).toBe('image/gif');
    expect(api.guessImageMimeByExt('a.bmp')).toBe('image/bmp');
    expect(api.guessImageMimeByExt('a.svg')).toBe('image/svg+xml');
    expect(api.guessImageMimeByExt('a.txt')).toBeNull();
    expect(api.guessImageMimeByExt(null)).toBeNull();
  });
});

function processedFile(overrides: Partial<ProcessedFile> = {}): ProcessedFile {
  return {
    filename: 'a.txt',
    mimeType: 'text/plain',
    sizeBytes: 3,
    gzipSizeBytes: undefined,
    base64Gzip: undefined,
    hashSha256Hex: 'hash',
    hashMode: 'binary',
    payloadBytes: new Uint8Array([1, 2, 3]),
    contentEncoding: 'identity',
    ...overrides,
  };
}

function snapshotResponse(id: number, filename: string, mimeType: string) {
  return {
    id,
    filename,
    mimeType,
    contentEncoding: 'identity',
    originalSizeBytes: 3,
    sha256Hex: 'hash',
  };
}

async function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(new TextDecoder().decode(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(file);
  });
}
