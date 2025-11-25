import { Injectable } from '@angular/core';
import { interval, map, Observable, takeWhile, timer } from 'rxjs';
import { ILinkRequest } from 'src/app/shared/request/request';
import { IFileRef, IFilesPayload } from '../interfaces/interface.file-ref';

@Injectable({
  providedIn: 'root'
})
export class LinkMapperService {
  constructor() { }

  normalizeTags(data: any): string[] {
    return Array.isArray(data?.tag?.[0]?.tags)
      ? data.tag[0].tags.map((t: any) =>
          typeof t === 'string' ? t : (t.value ?? t.tag ?? String(t)))
      : [];
  }
  normalizeUris(data: any): string[] {
    return Array.isArray(data?.uri?.[0]?.uris)
      ? data.uri[0].uris.map((u: any) =>
          typeof u === 'string' ? u : (u.value ?? u.uri ?? String(u)))
      : [];
  }
  normalizeFileID(data: any): string[] {
    return Array.isArray(data?.fileId?.[0]?.uris)
      ? data.fileID[0].fileID.map((u: any) =>
          typeof u === 'string' ? u : (u.value ?? u.fileID ?? String(u)))
      : [];
  }
  toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  toDateBr(dt: string | null): string | null {
    if (!dt) return null;
    let data = new Date(dt);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(data);
  }
  ISODate(dt: string | null): string | null {
    if (!dt) return null;
    const [datePart, timePart] = dt.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${(second || '00').padStart(2, '0')}`;
  }
   // Implementação única lida com ambos
  buildRequest(dados: any, tags: string[], uris: string[], files: string[] | IFilesPayload): any {
    // Normaliza tags/uris como você já fazia
    const normTags = Array.isArray(tags) ? tags : [];
    const normUris = Array.isArray(uris) ? uris : [];
    const isTimesheet = dados.categoria?.toLowerCase() === 'timesheet';
    const toISO = (dt: any) => isTimesheet ? this.ISODate(dt?.replace(',', '')) : null;
    // Normaliza arquivos para o NOVO contrato
    let fileRefs: IFileRef[];
    if (Array.isArray(files)) {
      // Era string[] (legado) → converte para [{ id:-1, filename }]
      fileRefs = files
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((filename) => ({ id: -1, filename }));
    } else if (files && Array.isArray(files.files)) {
      // Já no novo formato
      fileRefs = files.files
        .filter((f): f is IFileRef => !!f && typeof f.filename === 'string')
        .map((f) => ({
          id: typeof f.id === 'number' ? f.id : -1,
          filename: f.filename
        }));
    } else {
      fileRefs = [];
    }
    // Monte aqui o payload final esperado pelo backend
    const payload = {
      id: dados.id ? Number(dados.id) : undefined,
      name: dados.name,
      uri: { uris: normUris },
      categoria: dados.categoria ? this.toTitleCase(dados.categoria) : '',
      subCategoria: dados.subCategoria ? this.toTitleCase(dados.subCategoria) : '',
      descricao: dados.descricao,
      tag: { tags: normTags },
      fileID: { fileRefs },
      dataEntradaManha: toISO(dados?.dataEntradaManha),
      dataSaidaManha: toISO(dados?.dataSaidaManha),
      dataEntradaTarde: toISO(dados?.dataEntradaTarde),
      dataSaidaTarde: toISO(dados?.dataSaidaTarde),
      dataEntradaNoite: toISO(dados?.dataEntradaNoite),
      dataSaidaNoite: toISO(dados?.dataSaidaNoite)
    };
    return payload;
  }
  /**
   * Cria um observable que emite o tempo restante em segundos até chegar a zero.
   * 
   * @param durationMs Duração total em milissegundos
   * @returns Observable<number> que emite a contagem regressiva em segundos
   */
  countdown_(durationMs: number): Observable<number> {
    const totalSeconds = Math.floor(durationMs / 1000);
    return interval(1000).pipe(
      map(elapsed => totalSeconds - elapsed),
      takeWhile(remaining => remaining >= 0)
    );
  }
  countdown(durationMs: number): Observable<number> {
    const end = Date.now() + Math.max(0, Math.floor(durationMs));
    // timer(0, 1000) -> primeira emissão imediata
    return timer(0, 1000).pipe(
      map(() => Math.max(0, end - Date.now())),
      takeWhile(remainingMs => remainingMs >= 0)
    );
  }
}
