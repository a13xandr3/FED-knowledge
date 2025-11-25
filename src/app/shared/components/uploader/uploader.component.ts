import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { from } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';

import { InputFileComponent } from '../input-file/input-file.component';
import { base64ToUint8, toArrayBuffer } from 'src/app/shared/components/input-file/file-utils';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { ProcessedFile } from 'src/app/shared/request/request';

import { PreviewItem } from 'src/app/types/Files';

@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    InputFileComponent
  ],
})
export class UploaderComponent {
  @Input() allowMultiple = true;
  @Input() previews: PreviewItem[] = [];

  @Output() removedAt = new EventEmitter<number>();
  @Output() processed = new EventEmitter<ProcessedFile>();
  @Output() error = new EventEmitter<unknown>();
  @Output() cleared = new EventEmitter<void>();
  
  @ViewChild(InputFileComponent) private inner!: InputFileComponent;

  queue: ProcessedFile[] = [];
  sending = false;
  lastSaved: { id: string } | null = null;

  constructor(
    private http: HttpClient,
    private api: FileApiService,
    private snackService: SnackService,
  ) {}

  addPreviewsFromFileIds(ids: number[], cleanBefore = false) {
    return this.inner.addPreviewsFromFileIds(ids, cleanBefore);
  }
  // (1) método chamado ao carregar/processar cada arquivo
  onProcessed(p: ProcessedFile) {
    this.queue.push(p); // componente já traz hash, gzipSizeBytes etc.
  }
  // (2) transforma base64Gzip -> binário (Blob gzip)
  private toGzipBlob(p: ProcessedFile): Blob {
    if (!p.base64Gzip) throw new Error('includeBase64 deve ser true para enviar via base64.');
    const u8 = base64ToUint8(p.base64Gzip);                 // Uint8Array
    const ab = toArrayBuffer(u8);  
    return new Blob([ab], { type: 'application/gzip' });    // Blob gzip
  }
  // (3) monta o FormData e envia ao backend (suporta múltiplos)
  send() {
    if (this.sending || this.queue.length === 0) return;
    this.sending = true;
    from(this.queue).pipe(
      concatMap((p) => {
        // monta um FormData por arquivo (backend espera 1 por requisição)
        const form = new FormData();
        // monta o Blob com os bytes finais (gzip ou raw)
        // garante um ArrayBuffer "puro" do trecho visível do Uint8Array
        const ab: ArrayBuffer =
          p.payloadBytes.buffer instanceof ArrayBuffer
            ? p.payloadBytes.buffer.slice(
                p.payloadBytes.byteOffset,
                p.payloadBytes.byteOffset + p.payloadBytes.byteLength
              )
            : (() => {
                const out = new ArrayBuffer(p.payloadBytes.byteLength);
                new Uint8Array(out).set(p.payloadBytes);
                return out;
              })();

          const blob = new Blob(
            [ab],
            {
              type: p.contentEncoding === 'gzip'
                ? 'application/gzip'
                : (p.mimeType || 'application/octet-stream')
            }
          );
          const fname = p.contentEncoding === 'gzip'
            ? `${p.filename}.gz`
            : p.filename;

        // ---- CAMPOS CORRETOS QUE O BACKEND ESPERA ----
        form.append('file', blob, fname);                          // OK
        form.append('contentEncoding', p.contentEncoding);          // 'gzip' | 'identity'
        form.append('hashSha256Hex', p.hashSha256Hex);              // 64 hex
        form.append('originalSizeBytes', String(p.sizeBytes));      // nome correto
        if (p.gzipSizeBytes != null) {
          form.append('gzipSizeBytes', String(p.gzipSizeBytes));    // opcional
        }
        form.append('mimeType', p.mimeType || 'application/octet-stream');
        form.append('filename', p.filename);

        // NÃO enviar: 'gzip' (campo errado), 'sizeBytes' (nome antigo), 'hashMode'
        return this.api.upload(form);
      }),
      toArray() // junta todas as respostas num array
    ).subscribe({
      next: (resp) => {
        this.snackService.mostrarMensagem('Arquivo(s) enviado(s) com sucesso', 'Fechar');
        this.queue = [];
        this.sending = false;
      },
      error: (err) => {
        console.error('Falha no upload:', err);
        this.sending = false;
      }
    });
  }
  reset() { this.queue = []; }
  onError(err: unknown) {
    console.error(err);
  }
  download(id: string) {
    // Ex.: GET /api/files/:id/download (ver item 4)
    window.open(`/api/files/${id}/download`, '_blank');
  }
}