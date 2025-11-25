import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface LoadPreviewsCmd {
  ids: number[];
  cleanBefore: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FilePreviewBusService {

  private loadPreviewsSubject = new Subject<LoadPreviewsCmd>();
  /** Fluxo de comandos para carregar previews */
  readonly loadPreviews$ = this.loadPreviewsSubject.asObservable();

  /** Dispara o comando (coage para números e ignora entradas inválidas) */
  requestLoad(ids: any[], cleanBefore = true): void {
    const numericIds = (ids || [])
      .map(x => (typeof x === 'object' && x) ? (x.id ?? x.fileId ?? x.file_id ?? x.fileID) : x)
      .map(Number)
      .filter(Number.isFinite);
    if (numericIds.length) this.loadPreviewsSubject.next({ ids: numericIds, cleanBefore });
  }

}