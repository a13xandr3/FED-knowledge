import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { downloadFile, restoreFilesFromSnapshot } from '../../utils/file-utils';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';

import type { RenderKind } from '../../../types/Files';
import type { ShowFileData } from '../../interfaces/interface.file-ref';
import { FileApiService } from '../../services/file-api.service';
import { formatFileSize, hasSnapshotBase64, resolveRenderKind } from '../../utils/show-file.util';
@Component({
  selector: 'app-show-file',
  templateUrl: './show-file.component.html',
  styleUrl: './show-file.component.scss'
})
export class ShowFileComponent implements OnInit, OnDestroy {
  @ViewChild('docxHost', { static: false }) docxHost?: ElementRef<HTMLDivElement>;

  readonly data = inject<ShowFileData | null>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ShowFileComponent>);

  xlsxHtml: SafeHtml | null = null;
  docxHtml: SafeHtml | null = null;
  loading = true;
  originalFile?: File | null = null;
  objectUrl = '';
  safeObjectUrl: SafeResourceUrl | null = null;
  previewText = '';
  renderKind: RenderKind = 'other';
  itemId: string | number | undefined;

  private readonly filesApiService = inject(FileApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  get prettySize(): string {
    return formatFileSize(this.originalFile);
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      this.itemId = this.data?.itemId;
      // 100% via data do diálogo
      const snap = this.data?.snapshot;
      if (!snap) {
        this.renderKind = 'other';
        this.loading = false;
        return;
      }
      if (hasSnapshotBase64(snap)) {
        const { originalFile } = await restoreFilesFromSnapshot(snap, true);
        this.originalFile = originalFile;
      } else if (this.itemId) {
        // Se o snapshot não trouxer base64, tentamos baixar o blob do servidor
        try {
          const idNum = Number(this.itemId);
          const blob = await firstValueFrom(this.filesApiService.download(idNum));
          const filename = snap?.filename || `file-${idNum}`;
          const mime = snap?.mimeType || blob.type || 'application/octet-stream';
          this.originalFile = new File([blob], filename, { type: mime });
        } catch (err) {
          console.warn('[ShowFile] falha ao baixar blob do servidor, fallback:', err);
          throw err;
        }
      } else {
        throw new Error('Snapshot sem dados base64');
      }
      const originalFile = this.originalFile!;
      this.renderKind = resolveRenderKind(originalFile);

      if (this.renderKind === 'image') {
        this.objectUrl = URL.createObjectURL(originalFile);
      } else if (this.renderKind === 'text') {
        const ab = await originalFile.arrayBuffer();
        this.previewText = new TextDecoder('utf-8').decode(ab).slice(0, 50_000);
      } else if (this.renderKind === 'pdf') {
        this.objectUrl = URL.createObjectURL(originalFile);
        this.safeObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
      } else if (this.renderKind === 'xlsx') {
        const ab = await originalFile.arrayBuffer();
        await this.renderXlsx(ab);
      } else if (this.renderKind === 'docx') {
        const ab = await originalFile.arrayBuffer();
        this.loading = false;
        await this.nextTick();
        await this.ensureDocxHostReady();
        try {
          await this.renderDocxIntoHost(ab);
        } catch (e) {
          console.warn('[ShowFile] docx-preview falhou, fallback mammoth:', e);
          await this.renderDocxWithMammoth(ab);
        }
        return;
      }
    } catch (e) {
      console.error('[ShowFile] erro ao inicializar preview:', e);
      this.renderKind = 'other';
    }
    this.loading = false;
    return;
  }
  private async nextTick(): Promise<void> {
    this.cdr.detectChanges();
    await new Promise(r => setTimeout(r, 0));
  }
  download(): void {
    if (this.originalFile) {
      downloadFile(this.originalFile);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }
  /** Renderiza XLSX em HTML usando SheetJS */
  private async renderXlsx(ab: ArrayBuffer): Promise<void> {
    const XLSX = await import('xlsx'); // dynamic import para reduzir vendor
    const wb = XLSX.read(ab, { type: 'array' });
    const first = wb.SheetNames[0];
    const sheet = wb.Sheets[first];
    // Gera HTML da planilha
    const html: string = XLSX.utils.sheet_to_html(sheet, {
      header: '',
      footer: '',
    });
    // Sanitiza para binding seguro
    this.xlsxHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }
  private async ensureDocxHostReady(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      this.cdr.detectChanges();
      await new Promise(r => setTimeout(r, 0));
      if (this.docxHost?.nativeElement) return;
    }
    throw new Error('docxHost não disponível no template.');
  }
  /** Renderiza DOCX diretamente no container via docx-preview */
  private async renderDocxIntoHost(ab: ArrayBuffer): Promise<void> {
    const { renderAsync } = await import('docx-preview');
    const host = this.docxHost!.nativeElement;
    host.innerHTML = ''; // limpa render anterior, se houver
    await renderAsync(
      ab,
      host,
      undefined,
      {
        className: 'docx',
        useBase64URL: true, // evita links blob externos
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: false,
        // experimental: true, // se quiser habilitar recursos experimentais
      }
    );
  }
  /** Fallback: converte DOCX -> HTML com mammoth (menor fidelidade, mais leve) */
  private async renderDocxWithMammoth(ab: ArrayBuffer): Promise<void> {
    const mammoth = await import('mammoth/mammoth.browser');
    const result = await mammoth.convertToHtml({ arrayBuffer: ab }, {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh"
      ]
    });
    this.docxHtml = this.sanitizer.bypassSecurityTrustHtml(result.value);
  }
}
