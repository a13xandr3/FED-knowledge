import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { gzip as pakoGzip, ungzip as pakoUngzip } from 'pako';
import { firstValueFrom, Subscription } from 'rxjs';

import { FileApiService } from 'src/app/shared/services/file-api.service';
import { FilePreviewBusService } from 'src/app/shared/services/file-preview.bus.service';
import { ProcessedFile } from 'src/app/shared/request/request';
import { ShowFileComponent } from 'src/app/shared/components/show-file/show-file.component';

import { PreviewItem, FilesPayload, ZlibLevel } from 'src/app/types/Files';
import { IFileRef } from 'src/app/shared/interfaces/interface.file-ref';
@Component({
  selector: 'app-input-file',
  templateUrl: './input-file.component.html',
  styleUrls: ['./input-file.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatProgressBarModule
  ],
})
export class InputFileComponent implements OnInit, OnDestroy {
  /** MIME(s) aceitos. Ex.: 'image/*' | 'application/pdf' */
  @Input() accept = '*/*';
  /** Limite opcional (bytes). Ex.: 20 * 1024 * 1024 = 20MB */
  @Input() maxBytes?: number;
  /** true => gera Base64 do payload; false => só bytes + hash */
  @Input() includeBase64 = true;
  /** Mantido por compatibilidade. O hash gerado é sempre do binário final. */
  @Input() hashMode: 'binary' | 'base64' = 'binary';
  /** Nível do pako (fallback). Ignorado quando houver CompressionStream. */
  @Input() gzipLevel: ZlibLevel = 6;
  @Input() allowMultiple = true;
  @Input() previews: PreviewItem[] = [];
  @Output() removedAt = new EventEmitter<number>();
  @Output() processed = new EventEmitter<ProcessedFile>();
  @Output() error = new EventEmitter<unknown>();
  @Output() cleared = new EventEmitter<void>();
  @Output() removedRef = new EventEmitter<{ id?: number; index: number; filename: string }>();

  // dentro da classe:
  private previewBusSub?: Subscription;
  // --------- estado UI ---------
  dragActive = false;
  isProcessing = false;
  progress = 0;
  fileName = '';
  fileSizeBytes = 0;
  mimeType?: string;
  gzipSizeBytes?: number;          // opcional, coerente com a interface
  base64Gzip: string | null = null;
  hashSha256Hex: string | null = null;
  constructor(
    private filesSvc: FileApiService, 
    private previewBus: FilePreviewBusService,
    private dialog: MatDialog
  ) {}
  ngOnInit(): void {
    // escuta requisições externas de carregar previews a partir de fileId(s):
    this.previewBusSub = this.previewBus.loadPreviews$
      .subscribe(({ ids, cleanBefore }) => {
        this.addPreviewsFromFileIds(ids, cleanBefore);
      });      
  }
  ngOnDestroy(): void {
    this.previewBusSub?.unsubscribe();
  }
  // ---------------- Drag & Drop ----------------
  onDragOver(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
  }
  onDragEnter(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    this.dragActive = true;
  }
  onDragLeave(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    this.dragActive = false;
  }
  onDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    this.dragActive = false;
    const fl = e.dataTransfer?.files;
    if (fl && fl.length) {
      for (const f of Array.from(fl)) this.processFile(f);
    }
  }
  // ---------------- Input padrão ----------------
  onFileInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length) {
      for (const f of Array.from(files)) this.processFile(f);
      // limpa para permitir selecionar o mesmo arquivo novamente
      input.value = '';
    }
  }
  isImage(p: PreviewItem): boolean {
    // True para qualquer "image/*", ignorando caixa/letras
    return /^image\//i.test(p?.mimeType ?? '');
  }
  // ---------------- Pipeline principal ----------------
  private resetState() {
    this.isProcessing = false;
    this.progress = 0;
    this.fileName = '';
    this.fileSizeBytes = 0;
    this.mimeType = undefined;
    this.base64Gzip = null;
    this.hashSha256Hex = null;
    this.gzipSizeBytes = undefined;
  }
  /**
   * Manipula o clique em uma miniatura. Se houver um ID válido, obtém o snapshot
   * completo via serviço, grava em sessionStorage e navega para /show-file.
   * Arquivos sem ID (id = 0) são ignorados.
   */
  async onPreviewClick(p: PreviewItem): Promise<void> {
    const idNum = Number(p.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return;
    }
    try {
      const snapshot = await firstValueFrom(this.filesSvc.getSnapshot(idNum, true));
      const dialogRef = this.dialog.open(ShowFileComponent, {
          autoFocus: true,
          width: '90vw',
          maxWidth: '98vw',
          height: '90vh',
          data: { 
            snapshot,
            itemId: idNum 
          },
        });
        dialogRef.afterClosed().subscribe((result) => {
          if (result?.categoria) {
            //this.linkStateService.triggerRefresh();
          }
        });
    } catch (err) {
      console.error('Falha ao carregar snapshot para preview:', err);
      this.error.emit(err);
    }
  }
  async processFile(file: File) {
    try {
      this.resetState();
      this.isProcessing = true;
      // SNAPSHOT LOCAL (não será afetado por outras chamadas concorrentes)
      const fileName = file.name;
      const fileSizeBytes = file.size;
      const mimeType = file.type || undefined;
      // (opcional) atualiza UI com o último arquivo tocado
      this.fileName = fileName;
      this.fileSizeBytes = fileSizeBytes;
      this.mimeType = mimeType;
      if (this.maxBytes && fileSizeBytes > this.maxBytes) {
        const mb = (this.maxBytes / (1024 * 1024)).toFixed(1);
        throw new Error(`Arquivo excede o limite de ${mb} MB.`);
      }
      // 1) Compressão (gzip) com progresso
      const gzipU8 = await this.compressWithProgress(file);
      this.gzipSizeBytes = gzipU8.byteLength;
      this.setProgress(85);
      // 2) Decidir se mantém gzip (sempre com variáveis locais)
      let useGzip = !this.isAlreadyCompressed(mimeType, fileName);
      if (!useGzip) {
        useGzip = this.shouldKeepGzip(fileSizeBytes, gzipU8.byteLength, 0.95);
      } else {
        useGzip = this.shouldKeepGzip(fileSizeBytes, gzipU8.byteLength, 0.98);
      }
      let payloadBytes: Uint8Array;
      let contentEncoding: 'gzip' | 'identity';
      if (useGzip) {
        payloadBytes = gzipU8;
        contentEncoding = 'gzip';
      } else {
        const ab = await this.readFileAsArrayBuffer(file, (r) => {
          this.setProgress(Math.min(70, Math.floor(r * 70)));
        });
        payloadBytes = new Uint8Array(ab);
        contentEncoding = 'identity';
        this.gzipSizeBytes = undefined;
      }
      this.setProgress(90);
      // 3) Base64 (opcional)
      let base64GzipLocal: string | undefined;
      if (this.includeBase64) {
        base64GzipLocal = await this.uint8ToBase64(payloadBytes);
        this.setProgress(95);
      }
      // 4) Hash (sempre do binário final persistido)
      const hashHex = await this.sha256HexFromBuffer(this.asArrayBuffer(payloadBytes));
      this.hashSha256Hex = hashHex;
      // 4.1) Preview (somente imagens) — use SEMPRE as variáveis locais
      //if ((mimeType ?? '').startsWith('image/')) {
        const previewFile = await this.payloadToFile({
          payloadBytes,
          contentEncoding,
          filename: fileName,
          mimeType
        });
        const id = 0;
        const url = this.fileToObjectUrl(previewFile);
        this.previews.push({id, url, filename: fileName, mimeType, sizeBytes: fileSizeBytes});
      //}
      this.setProgress(100);
      // 5) Emit do payload (use variáveis locais)
      const payload: ProcessedFile = {
        filename: fileName,
        mimeType,
        sizeBytes: fileSizeBytes,
        gzipSizeBytes: this.gzipSizeBytes,
        base64Gzip: this.includeBase64 ? base64GzipLocal : undefined,
        hashSha256Hex: hashHex,
        hashMode: 'binary',
        payloadBytes,
        contentEncoding
      };
      this.processed.emit(payload);
    } catch (err) {
      console.error('Falha ao processar arquivo:', err);
      this.error.emit(err);
      alert((err as Error)?.message ?? 'Falha ao processar arquivo.');
    } finally {
      this.isProcessing = false;
    }
  }
  clear() {
    // revoga todos os object URLs para evitar vazamento
    for (const p of this.previews) this.revokeObjectUrl(p.url);
    this.previews = [];
    this.resetState();
    this.cleared.emit();
  }
  // ---------------- Compressão com progresso ----------------
  private async compressWithProgress(file: File): Promise<Uint8Array> {
    const hasCompressionStream = typeof (globalThis as any).CompressionStream === 'function';
    // Preferência: API nativa de streams (não bloqueia a UI)
    if (hasCompressionStream && typeof (file as any).stream === 'function') {
      const total = file.size || 1;
      let loaded = 0;
      const progressStream = new TransformStream<Uint8Array, Uint8Array>({
        transform: (chunk, controller) => {
          loaded += chunk.byteLength;
          // mapeia leitura 0..1 -> progresso até 70%
          this.setProgress(Math.min(70, Math.floor((loaded / total) * 70)));
          controller.enqueue(chunk);
        }
      });
      const cs = new (globalThis as any).CompressionStream('gzip');
      const compressedStream = (file as any).stream().pipeThrough(progressStream).pipeThrough(cs);
      const ab = await new Response(compressedStream).arrayBuffer();
      return new Uint8Array(ab);
    }
    // Fallback: FileReader + pako (sincrono). Atualiza progresso na leitura.
    const arrayBuffer = await this.readFileAsArrayBuffer(file, (ratio) => {
      this.setProgress(Math.min(60, Math.floor(ratio * 60)));
    });
    const u8 = new Uint8Array(arrayBuffer);
    const gz = pakoGzip(u8, { level: this.gzipLevel });
    return gz;
  }
  // ---------------- Utilitários ----------------
  private setProgress(p: number) {
    this.progress = Math.max(0, Math.min(100, p | 0));
  }
  private readFileAsArrayBuffer(file: File, onProgress?: (ratio: number) => void): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
      };
      fr.onload = () => resolve(fr.result as ArrayBuffer);
      fr.readAsArrayBuffer(file);
    });
  }
  /** Converte Uint8Array -> Base64 (via Blob + FileReader), sem estourar memória */
  private uint8ToBase64(u8: Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
      const ab = this.asArrayBuffer(u8);
      // Como o payload pode ser gzip ou raw, use o tipo genérico correto
      const blob = new Blob([ab], { type: 'application/octet-stream' });
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => {
        const dataUrl = String(fr.result); // "data:application/octet-stream;base64,AAAA..."
        const idx = dataUrl.indexOf('base64,');
        resolve(idx >= 0 ? dataUrl.substring(idx + 'base64,'.length) : dataUrl);
      };
      fr.readAsDataURL(blob);
    });
  }
  /** Garante um ArrayBuffer real (não-Shared) do trecho visível do view */
  private asArrayBuffer(view: ArrayBufferView): ArrayBuffer {
    const { buffer, byteOffset, byteLength } = view;
    // Se já é ArrayBuffer, recorta exatamente o segmento do view:
    if (buffer instanceof ArrayBuffer) {
      return buffer.slice(byteOffset, byteOffset + byteLength);
    }
    // Se for SharedArrayBuffer (ou outro ArrayBufferLike), copia p/ ArrayBuffer novo:
    const ab = new ArrayBuffer(byteLength);
    new Uint8Array(ab).set(new Uint8Array(buffer, byteOffset, byteLength));
    return ab;
  }
  /** SHA-256 (hex) de ArrayBufferView/ArrayBuffer */
  private async sha256HexFromBuffer(buf: BufferSource): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
    return this.bufferToHex(hashBuffer);
  }
  private bufferToHex(buf: ArrayBuffer): string {
    const arr = new Uint8Array(buf);
    const hex: string[] = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) hex[i] = arr[i].toString(16).padStart(2, '0');
    return hex.join('');
  }
  /** Tipos geralmente já comprimidos (gzip raramente ajuda) */
  private isAlreadyCompressed(mime?: string, name?: string): boolean {
    const ext = (name || '').toLowerCase();
    const m = (mime || '').toLowerCase();
    return (
      m.startsWith('image/jpeg') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') ||
      m.startsWith('image/png')  || ext.endsWith('.png')  ||
      m.startsWith('image/webp') || ext.endsWith('.webp')||
      m.startsWith('application/pdf') || ext.endsWith('.pdf') ||
      ext.endsWith('.zip') || ext.endsWith('.gz') || ext.endsWith('.rar') ||
      ext.endsWith('.7z')  || ext.endsWith('.docx') || ext.endsWith('.xlsx') || ext.endsWith('.pptx')
    );
  }
  /** Mantém gzip se reduzir pelo menos (1 - threshold)*100 % */
  private shouldKeepGzip(rawLen: number, gzLen: number, threshold = 0.98): boolean {
    return gzLen <= rawLen * threshold;
  }
  /* ===================== Helpers para preview ===================== */
  /** Descompacta gzip para Uint8Array (DecompressionStream -> fallback p/ pako) */
  private async gunzip(u8: Uint8Array): Promise<Uint8Array> {
    const hasDS = typeof (globalThis as any).DecompressionStream === 'function';
    if (hasDS) {
      const ab = this.asArrayBuffer(u8); // garante ArrayBuffer puro
      const ds = new (globalThis as any).DecompressionStream('gzip');
      const stream = new Blob([ab]).stream().pipeThrough(ds);
      const outAb = await new Response(stream).arrayBuffer();
      return new Uint8Array(outAb);
    }
    // fallback: pako
    return pakoUngzip(u8); // ver correção do alias abaixo
  }
  /**
   * Transforma o payload em memória (gzip ou raw) em um File "abrível" no browser.
   */
  private async payloadToFile(p: {
    payloadBytes: Uint8Array;
    contentEncoding: 'gzip' | 'identity';
    filename: string;
    mimeType?: string;
  }): Promise<File> {
    const rawU8 = p.contentEncoding === 'gzip' ? await this.gunzip(p.payloadBytes) : p.payloadBytes;
    const rawAb = this.asArrayBuffer(rawU8); // ArrayBuffer puro
    return new File([rawAb], p.filename, {
      type: p.mimeType || 'application/octet-stream',
      lastModified: Date.now()
    });
  }
  /** Gera um Object URL para exibir o File (revogue quando não precisar) */
  private fileToObjectUrl(file: File): string {
    return URL.createObjectURL(file);
  }
  /** Revoga o Object URL quando não precisar mais (evita vazamento de memória) */
  private revokeObjectUrl(url?: string | null) {
    if (url) URL.revokeObjectURL(url);
  }
  removePreviewAt(
      data: any,
      removeId: number
    ): FilesPayload {
      // 1) Parse seguro (aceita string JSON ou objeto/array)
      let parsed: any;
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e: any) {
        console.error('JSON inválido', e);
        return { fileRefs: [] };
      }
      // 2) Descobre a lista base (pode ser um array de previews OU { fileRefs: [...] })
      const list: any[] = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.fileRefs) ? parsed.fileRefs : []);
        // 3) Normaliza (id pode vir como id ou fileId)
      const normalized: IFileRef[] = list
        .map((fr: any) => ({
          id: Number(fr?.id ?? fr?.fileId),
          filename: String(fr?.filename ?? '')
        }))
        .filter(fr => Number.isFinite(fr.id) && !!fr.filename.trim());
        // 4) Remove pelo id informado (sem mexer nos outros itens)
        const idToRemove = Number(removeId);
        const kept = normalized.filter(fr => fr.id !== idToRemove);

        // 5) Se o 'data' era o próprio this.previews, remova também da UI na mesma referência
        if (Array.isArray(data) && data === this.previews) {
          const idx = this.previews.findIndex(p => Number((p as any)?.id ?? (p as any)?.fileId) === idToRemove);
          if (idx >= 0) {
            const removed = this.previews[idx];
            this.revokeObjectUrl(removed.url); // evita vazamento
            this.previews.splice(idx, 1);      // mantém a mesma referência (detecção Angular)
            this.removedAt.emit(idx);          // notifica o pai
          }
        }
        const result: FilesPayload = { fileRefs: kept };
      console.log('Após remoção input-file:', result.fileRefs);
      return result;
  }
  public async addPreviewsFromFileIds(ids: number[], cleanBefore = false): Promise<void> {
    if (cleanBefore) {
      for (const p of this.previews) this.revokeObjectUrl(p.url);
      this.previews = [];
    }
    const items = await this.filesSvc.buildPreviewsFromFileIds(ids);
    this.previews.push(...items);
  }
  transformFileName(filename: string): string {
    let resultado = '';
    const arr = filename.split('.');
    const parte1 = arr[0];
    const parte2 = arr[1];
    if (parte1.length > 20) {
      resultado = parte1.substring(0, 20) + '...' + '.' + parte2;
    }
    return resultado || filename;
  }
  onRemove(p: PreviewItem, index: number): void {
    if (!this.previews[index]) return;
    this.revokeObjectUrl(this.previews[index].url);
    this.previews.splice(index, 1);
    this.removedAt.emit(index); // pai atualiza o form/fileIDs
  }
  getIconClasses(p: PreviewItem): string[] {
    const mt = (p?.mimeType ?? '').toLowerCase();
    // Cobertura Word/Excel modernos (OOXML) e legados
    if (mt.includes('pdf')) return ['fa-file-pdf', 'text-red-500'];
    if (mt.includes('text')) return ['fa-file-txt', 'text-red-500'];
    if (mt.includes('word') || mt.includes('officedocument.wordprocessingml')) {
      return ['fa-file-word', 'text-blue-600'];
    }
    if (mt.includes('excel') || mt.includes('spreadsheetml')) {
      return ['fa-file-excel', 'text-green-600'];
    }
    // Vídeo genérico + casos comuns
    if (mt.startsWith('video/') || mt.includes('mp4') || mt.includes('mpeg4')) {
      return ['fa-file-video', 'text-purple-600'];
    }
    // Fallback
    return ['fa-file-alt', 'text-gray-500'];
  }
  // Evita re-render desnecessário do *ngFor
  trackById(index: number, p: PreviewItem): string | number {
    return p.id ?? p.filename ?? index;
  }
}