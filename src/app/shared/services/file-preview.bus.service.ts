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

  private readonly loadPreviewsSubject = new Subject<LoadPreviewsCmd>();
  /** Fluxo de comandos para carregar previews */
  readonly loadPreviews$ = this.loadPreviewsSubject.asObservable();

  private coerceFileId(value: unknown): unknown {
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;
      return record['id'] ?? record['fileId'] ?? record['file_id'] ?? record['fileID'];
    }

    return value;
  }

  /** Dispara o comando (coage para números e ignora entradas inválidas) */
  requestLoad(ids: readonly unknown[], cleanBefore = true): void {
    const numericIds = (ids || [])
      .map(x => this.coerceFileId(x))
      .map(Number)
      .filter(Number.isFinite);
    if (numericIds.length) this.loadPreviewsSubject.next({ ids: numericIds, cleanBefore });
  }

}
