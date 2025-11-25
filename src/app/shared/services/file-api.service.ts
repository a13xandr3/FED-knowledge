import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { firstValueFrom as rxjsFirstValueFrom } from 'rxjs';
import { ProcessedFile, SnapshotResponse, FileSavedResponse } from '../request/request';
import { PreviewItem, FilesPayload } from 'src/app/types/Files';
/*
 * Não armazene o token de autenticação em constantes no momento da importação.
 * Em vez disso, recupere-o dinamicamente de localStorage quando necessário.
 */

@Injectable({
  providedIn: 'root'
})
export class FileApiService {
  private url = 'http://localhost:8080';
  private readonly base = '/api/files';

  constructor(private http: HttpClient) {}

  // 1) helpers mínimos (dentro da classe)
  private guessImageMimeByExt(filename?: string | null): string | null {
    if (!filename) return null;
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png':  return 'image/png';
      case 'webp': return 'image/webp';
      case 'gif':  return 'image/gif';
      case 'bmp':  return 'image/bmp';
      case 'svg':  return 'image/svg+xml';
      default:     return null;
    }
  }
  private isImageLike(mimeFromHdr: string | undefined, filename?: string | null): { ok: boolean; finalMime?: string } {
    const hdr = (mimeFromHdr || '').toLowerCase();
    if (hdr.startsWith('image/')) return { ok: true, finalMime: hdr };
    const byExt = this.guessImageMimeByExt(filename);
    return byExt ? { ok: true, finalMime: byExt } : { ok: false };  
  }
  private authHeaders(): HttpHeaders {
    const t = localStorage.getItem('token');
    return t ? new HttpHeaders({ 'Authorization': `Bearer ${t}` }) : new HttpHeaders();
  }
  upload(form: FormData): Observable<FileSavedResponse[]> {
    return this.http.post<FileSavedResponse[]>(`${this.url}/api/files`, form, {
      headers: this.authHeaders()
    });
  }
  delete(id: number): Observable<FileSavedResponse[]> {
    return this.http.delete<FileSavedResponse[]>(`${this.url}/api/files/delete/${id}`, {
      headers: this.authHeaders()
    });
  }
  getSnapshot(id: number, includeBase64 = false): Observable<SnapshotResponse> {
    return this.http.get<SnapshotResponse>(
      `${this.url}${this.base}/${id}?includeBase64=${includeBase64}`,
      { headers: this.authHeaders() } 
     );
  }
  /** Converte um Uint8Array (mesmo apoiado em SharedArrayBuffer) em ArrayBuffer "puro". */
  private toPureArrayBuffer(u8: Uint8Array): ArrayBuffer {
    if (u8.buffer instanceof ArrayBuffer) {
      // respeita offset/length do view
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    }
    // SharedArrayBuffer ou ArrayBufferLike -> copia
    const ab = new ArrayBuffer(u8.byteLength);
    new Uint8Array(ab).set(u8);
    return ab;
  }
  /** Descompacta gzip para Uint8Array (DecompressionStream -> fallback p/ pako). */
  private async gunzip(u8: Uint8Array): Promise<Uint8Array> {
    const hasDS = typeof (globalThis as any).DecompressionStream === 'function';
    if (hasDS) {
      const ab = this.toPureArrayBuffer(u8);
      const ds = new (globalThis as any).DecompressionStream('gzip');
      const stream = new Blob([ab]).stream().pipeThrough(ds);
      const outAb = await new Response(stream).arrayBuffer();
      return new Uint8Array(outAb);
    }
    // fallback: pako.ungzip (lazy import)
    const { ungzip } = await import('pako');
    return ungzip(u8); // retorna Uint8Array
  }
  /**
   * Transforma o payload em memória (gzip ou raw) em um File "abrível" no browser.
   * @param p Objeto com payloadBytes, contentEncoding ('gzip'|'identity'), filename, mimeType
   */
  async payloadToFile(p: {
    payloadBytes: Uint8Array;
    contentEncoding: 'gzip' | 'identity';
    filename: string;
    mimeType?: string;
  }): Promise<File> {
    // 1) Se vier gzip, descompacta para bytes originais
    const rawU8 = p.contentEncoding === 'gzip'
      ? await this.gunzip(p.payloadBytes)
      : p.payloadBytes;
    // 2) Garante ArrayBuffer "puro" para o File
    const rawAb = this.toPureArrayBuffer(rawU8);
    // 3) Cria o File com tipo original (ou genérico)
    return new File([rawAb], p.filename, {
      type: p.mimeType || 'application/octet-stream',
      lastModified: Date.now()
    });
  }
  /** Gera um Object URL para exibir o File (lembre de revogar depois). */
  fileToObjectUrl(file: File): string {
    return URL.createObjectURL(file);
  }
  /** Revoga o Object URL quando não precisar mais (evita vazamento de memória). */
  revokeObjectUrl(url?: string | null) {
    if (url) URL.revokeObjectURL(url);
  }
  /** Constrói o FormData conforme o FileController */
  private toFormData(p: ProcessedFile): FormData {
    const ab = this.toPureArrayBuffer(p.payloadBytes);
    const blob = new Blob(
      [ab],
      {
        type: p.contentEncoding === 'gzip'
          ? 'application/gzip'
          : (p.mimeType || 'application/octet-stream')
      }
    );
    const fd = new FormData();
    // O backend espera "file" (binário do payload) + metadados:
    fd.append('file', blob, p.filename);                        // não acrescente .gz; enviamos flag contentEncoding
    fd.append('contentEncoding', p.contentEncoding);            // 'gzip' | 'identity'
    fd.append('hashSha256Hex', p.hashSha256Hex);                // 64 chars
    fd.append('originalSizeBytes', String(p.sizeBytes));        // long
    if (p.gzipSizeBytes != null) fd.append('gzipSizeBytes', String(p.gzipSizeBytes));
    if (p.mimeType) fd.append('mimeType', p.mimeType);
    if (p.filename) fd.append('filename', p.filename);
    return fd;
  }
  /** Envia 1 arquivo (compatível com FileController @PostMapping /api/files) */
  uploadOne(p: ProcessedFile): Observable<FileSavedResponse> {
    const fd = this.toFormData(p);
    return this.http.post<FileSavedResponse>(`${this.url}${this.base}`, fd);
  }
  
  /** Baixa o ARQUIVO ORIGINAL (já descompactado) */
  download(id: number) {
    return this.http.get(
      `${this.url}${this.base}/${id}/download`, 
      { responseType: 'blob', headers: this.authHeaders() });
  }
  // 2) ajuste no método (troque apenas o bloco do jobs)
  public async buildPreviewsFromFileIds(ids: any[]) {
    const numericIds = (ids || [])
      .map(x => typeof x === 'object' && x !== null ? (x.id ?? x.fileId ?? x.file_id ?? x.fileID) : x)
      .map(Number)
      .filter(Number.isFinite);
    if (!numericIds.length) return [];
    const items: Array<PreviewItem | undefined> = new Array(numericIds.length);
    const jobs = numericIds.map((id, pos) => (async () => {
      const snap: SnapshotResponse = await firstValueFrom(this.getSnapshot(id, false));
      const blob: Blob = await firstValueFrom(this.download(id));
      const filename = snap?.filename || `file-${id}`;
      const mimeHdr = snap?.mimeType || blob.type || '';
      const { ok, finalMime } = this.isImageLike(mimeHdr, filename);
      // cria o File com o MIME correto
      const file = new File([blob], filename, {
        type: finalMime || mimeHdr || 'application/octet-stream',
        lastModified: Date.now()
      });
      // gera URL apenas para imagens; demais ficam com string vazia
      const url = ok ? this.fileToObjectUrl(file) : '';
      items[pos] = {
        url,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: blob.size,
        id
      };
    })());
    await Promise.all(jobs);
    return items.filter((x): x is PreviewItem => !!x);
  }
  public async ___buildPreviewsFromFileIds(ids: any[]) {
    const numericIds = (ids || [])
      .map(x => (typeof x === 'object' && x !== null) ? (x.id ?? x.fileId ?? x.file_id ?? x.fileID) : x)
      .map(Number)
      .filter(Number.isFinite);
    if (!numericIds.length) return [];
    // Prealoca e preenche pela POSIÇÃO (ordem de entrada):
    const items: Array<PreviewItem | undefined> = new Array(numericIds.length);
    const jobs = numericIds.map((id, pos) => (async () => {
      const snap: SnapshotResponse = await firstValueFrom(this.getSnapshot(id, false));
      const blob: Blob = await firstValueFrom(this.download(id));
      const filename = snap?.filename || `file-${id}`;
      const mimeHdr  = snap?.mimeType || blob.type || '';
      const { ok, finalMime } = this.isImageLike(mimeHdr, filename);
      if (!ok) return; // mantém posição vazia se não for imagem
      const file = new File([blob], filename, {
        type: finalMime || mimeHdr || 'application/octet-stream',
        lastModified: Date.now()
      });
      const url = this.fileToObjectUrl(file);
      items[pos] = {
        url,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: blob.size,
        id: id,               // <<< preserva ID no preview
      };
    })());
    await Promise.all(jobs);
    // remove “buracos” (itens undefined por não serem imagens)
    return items.filter((x): x is PreviewItem => !!x);
  }

  public async _buildPreviewsFromFileIds(ids: any[]) {
    const numericIds = (ids || [])
      .map(x => (typeof x === 'object' && x !== null) ? (x.id ?? x.fileId ?? x.file_id ?? x.fileID) : x)
      .map(Number)
      .filter(n => Number.isFinite(n));

    if (!numericIds.length) return [];

    // Prealoca e preenche pela POSIÇÃO (ordem de entrada):
    const items: Array<PreviewItem | undefined> = new Array(numericIds.length);
  //const items: Array<{ url: string; filename: string; mimeType?: string; sizeBytes: number }> = [];

    const jobs = numericIds.map(async (id) => {
      const snap: SnapshotResponse = await firstValueFrom(this.getSnapshot(id, false));
      const blob: Blob = await firstValueFrom(this.download(id));

      const filename = snap?.filename || `file-${id}`;
      const mimeHdr = snap?.mimeType || blob.type || ''; // pode vir vazio ou application/octet-stream
      const { ok, finalMime } = this.isImageLike(mimeHdr, filename);
      if (!ok) return;

      // Cria um File com MIME final (corrigido por extensão quando necessário)
      const file = new File([blob], filename, {
        type: finalMime || mimeHdr || 'application/octet-stream',
        lastModified: Date.now()
      });

      const url = this.fileToObjectUrl(file);
      items.push({
        id,
        url,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: blob.size
      });
    });

    await Promise.all(jobs);
    return items;
  }
}
/**
 * Retorna uma Promise que resolve com o primeiro valor emitido pelo Observable.
 * @param observable Observable a ser convertido em Promise
 */
function firstValueFrom<T>(observable: Observable<T>): Promise<T> {
  return rxjsFirstValueFrom(observable);
}