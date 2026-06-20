import { DatePipe } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit, Optional, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';

import { catchError, concatMap, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { NgxMaskDirective } from 'ngx-mask';

import { FileSavedResponse, ILinkRequest, ProcessedFile } from '../../request/request';
import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { LinkMapperService } from 'src/app/shared/services/link-mapper.service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { FilesPayload, FileRef as FileRefCore, extractIds, idToFilename, diffRemovedIds, mergeExistingAndNew } from 'src/app/shared/components/input-file/file-selection.util';
import { FileRef } from 'src/app/shared/interfaces/interface.files';
import { MatChipsComponent } from 'src/app/shared/components/mat-chips/mat-chips.component';
import { UploaderComponent } from 'src/app/shared/components/uploader/uploader.component';
import { TokenTimeLeftPipe } from 'src/app/shared/pipes/token-time-left.pipe';
import { TokenExpiringSoonPipe } from 'src/app/shared/pipes/token-expiring-soon.pipe';

import { QuillComponent } from '../quill/quill.component';
import { PreviewItem } from 'src/app/types/Files';

@Component({
  selector: 'app-dialog-content',
  templateUrl: './dialog-content.component.html',
  styleUrl: './dialog-content.component.scss',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatChipsComponent,
    MatInputModule,
    ReactiveFormsModule,
    NgxMaskDirective,
    UploaderComponent,
    QuillComponent,
    TokenTimeLeftPipe,
    TokenExpiringSoonPipe
  ],
  providers: [
    DatePipe
  ]
})
export class DialogContentComponent implements OnInit {
  tempoRestanteMs = 0;
  allTags: string[] = [];
  allUris: string[] = [];
  allFiles: FilesPayload = { files: [] };
  fr: FormGroup;
  currentContent = '';
  totalHorasDia!: string;
  public previewsFromIds: PreviewItem[] = [];
  /** Fila de arquivos processados pelo input-file (payloadBytes etc.) */
  private initialIds: number[] = [];  
  private fileQueue: ProcessedFile[] = [];
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private service: HomeService,
    private fb: FormBuilder,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<DialogContentComponent>,
    private linkStateService: LinkStateService,
    private linkMapperService: LinkMapperService,
    private snackService: SnackService,
    private filesApiService: FileApiService
    ){
    this.iniciarContagem(86400000); // 24 horas
    if ( this.data?.categoria?.toLowerCase() == 'timesheet' ) {
      this.totalHorasDia = data?.totalHorasDia;
    }
    this.fr = this.fb.group({
      id: [{ value: data?.id || '', disabled: true }],
      name: [data?.name],
      uri: [this.linkMapperService.normalizeUris(data)],
      tag: [this.linkMapperService.normalizeTags(data)],
      fileID: [Array.isArray(this.data?.fileID) ? this.data.fileID : []],
      categoria: [data?.categoria],
      subCategoria: [data?.subCategoria],
      descricao: [data?.descricao || ''],
      oldCategoria: [data?.oldCategoria],
      status: [data?.status],
      dataEntradaManha: [this.toDateBrOrEmpty(data?.dataEntradaManha)],
      dataSaidaManha: [this.toDateBrOrEmpty(data?.dataSaidaManha)],
      dataEntradaTarde: [this.toDateBrOrEmpty(data?.dataEntradaTarde)],
      dataSaidaTarde: [this.toDateBrOrEmpty(data?.dataSaidaTarde)],
      dataEntradaNoite: [this.toDateBrOrEmpty(data?.dataEntradaNoite)],
      dataSaidaNoite: [this.toDateBrOrEmpty(data?.dataSaidaNoite)]
    });
  }
  private toDateBrOrEmpty(value: string | null | undefined): string {
    return this.linkMapperService.toDateBr(value ?? null) ?? '';
  }

  get dialogTitleId(): unknown {
    return this.fr.get('id')?.value;
  }

  get isTiCategory(): boolean {
    return this.categoryValue.toLowerCase() === 'ti';
  }

  get isTimesheet(): boolean {
    return this.categoryValue.toLowerCase() === 'timesheet';
  }

  private get categoryValue(): string {
    return String(this.fr.get('categoria')?.value ?? '');
  }

  ngOnInit(): void {
    const ids = (this.data?.fileID?.[0]?.fileRefs ?? [])
      .map((x: any) => Number(
        typeof x === 'object' ? (x.id ?? x.fileId ?? x.file_id ?? x.fileID) : x
      ))
      .filter(Number.isFinite);
    if (ids.length) {
      this.initialIds = [...ids]; // snapshot de origem
      this.filesApiService.buildPreviewsFromFileIds(ids).then(items => {
        this.previewsFromIds = items;               // items agora possuem { id, url, filename... }
        this.fr.get('fileID')?.setValue(ids);       // form reflete o que foi carregado
      });
    }
  }

  fechar(): void {
    this.dialogRef.close();
  }

  deleteFiles(currentIds: number[]): Observable<unknown> {
    const delete$: Observable<unknown> = currentIds.length
      ? forkJoin(currentIds.map(id => this.filesApiService.delete(id)))
      : of(null);
    return delete$;
  }
  uploadOne(): Observable<FileRef[]> {
    const upload$: Observable<FileRef[]> = this.fileQueue.length
      ? forkJoin(this.fileQueue.map(p => this.filesApiService.uploadOne(p))).pipe(
          map((resps: FileSavedResponse[]) =>
            resps.map((r, i) => ({
              id: r.id,
              filename: this.fileQueue[i]?.filename ?? `file-${r.id}`
            }))
          )
        )
      : of<FileRef[]>([]);
    return upload$;
  }
  onChipClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const url = target?.innerText.trim();
    if ( url && this.isValidHttpUrl(url) && !url.endsWith('X') ) {
      const tempAnchor = document.createElement('a');
      tempAnchor.href = url;
      tempAnchor.target = '_blank';
      tempAnchor.click();
    }
  }

  private isValidHttpUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  iniciarContagem(ms: number): void {
    this.linkMapperService.countdown(ms)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: remainingMs => this.tempoRestanteMs = remainingMs,
    });
  }

  onProcessed(p: ProcessedFile): void {
    this.fileQueue.push(p);
    this.allFiles.files.push({ id: -1, filename: p.filename });
  }

  onClearedFiles(): void {
    this.fileQueue = [];
    this.allFiles = { files: [] };
  }

  onError(err: unknown): void {
    console.error(err);
  }

  onPreviewRemoved(idx: number): void {
    const removedId = this.previewsFromIds[idx]?.id;
    this.removePreviewIdFromForm(removedId);
  }

  onPreviewRemovedRef(ref: { id?: number; index: number; filename: string }): void {
    this.removePreviewIdFromForm(ref.id);
  }

  private removePreviewIdFromForm(removedId: unknown): void {
    const id = Number(removedId);
    if (!Number.isFinite(id)) return;
    const ctrl = this.fr.get('fileID');
    const curr: number[] = (ctrl?.value ?? []).filter((v: any) => v !== id);
    ctrl?.setValue(curr);
  }

  private deleteMany(ids: number[]): Observable<unknown> {
    return ids.length ? forkJoin(ids.map(id => this.filesApiService.delete(id))) : of(null);
  } 

  private uploadQueue(): Observable<FileRefCore[]> {
    return this.fileQueue.length
      ? forkJoin(this.fileQueue.map(p => this.filesApiService.uploadOne(p))).pipe(
          map(resps => resps.map((r, i) => ({ id: r.id, filename: this.fileQueue[i]?.filename ?? `file-${r.id}` } as FileRefCore)))
        )
      : of<FileRefCore[]>([]);
  }
  salvar(): void {
    if (this.fr.invalid) return;
    const dados = this.fr.getRawValue();
    const isInclusao = this.data.status === 'inclusao';
    this.allTags = dados.tag || [];
    this.allUris = dados.uri || [];
    // 1) IDs atuais a partir dos previews compartilhadosf
    const currentIds = extractIds(this.previewsFromIds);
    // 2) Para UPDATE: calcule exatamente o que foi removido
    const toDelete = isInclusao ? [] : diffRemovedIds(this.initialIds, currentIds);
    // 3) Execução: upload -> salvar card -> apagar anexos removidos
    this.uploadQueue().pipe(
      map((newRefs) => {
        const nameMap = idToFilename(this.previewsFromIds);
        const filesPayload = mergeExistingAndNew(currentIds, nameMap, newRefs);
        return this.linkMapperService.buildRequest(
          dados,
          this.allTags,
          this.allUris,
          filesPayload
        );
      }),
      concatMap((req: ILinkRequest) => {
        return isInclusao ? this.service.postLink(req) : this.service.putLink(req);
      }),
      switchMap(() => this.deleteMany(toDelete)),
      catchError(err => {
        this.snackService.mostrarMensagem(err?.message ?? 'Falha ao salvar', 'Fechar');
        return throwError(() => err);
      })
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        this.snackService.mostrarMensagem(
          isInclusao ? 'Card Inserido com sucesso!' : 'Card Atualizado com sucesso!', 'Fechar'
        );
        this.linkStateService.triggerRefresh();
        this.dialogRef.close(dados);
        this.fileQueue = [];
        this.initialIds = extractIds(this.previewsFromIds);
      },
      error: () => {}
    });
  }
}
