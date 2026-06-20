import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ILinkRequest } from 'src/app/shared/request/request';
import { ILinksResponse } from 'src/app/shared/response/response';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly urbase = environment.bffUrl;

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('kb_token') || localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  carregaConteudo(urlTarget: string): Observable<string> {
    return this.http.get(`${this.urbase}/proxy?url=${urlTarget}`, { responseType: 'text' });
  }

  getLinks(pageIndex: number, pageSize: number, excessao: readonly string[], categoria: string, tag: string): Observable<{ links: ILinksResponse[]; total: number }> {
    let params = new HttpParams()
    .set('page', pageIndex.toString())
    .set('limit', pageSize.toString())
    .set('categoria', categoria)
    .set('tag', tag);
    excessao.forEach((item) => {
      params = params.append('excessao', item);
    });
    return this.http.get<{ links: ILinksResponse[]; total: number }>(`${this.urbase}/api/atividades`, {
      params,
      headers: this.authHeaders()
    });
  }
  //** Monta lista de Dropdown */
  getCategorias(): Observable<ILinksResponse> {
    return this.http.get<ILinksResponse>(`${this.urbase}/api/atividades/categorias`, {
      headers: this.authHeaders()
    });
  }
  getTags(): Observable<ILinksResponse> {
    return this.http.get<ILinksResponse>(`${this.urbase}/api/atividades/tags`, {
      headers: this.authHeaders()
    });
  }
  //** ao selecionar o item no dropdown */
  getSearchCategoria(pageIndex: number, pageSize: number, itemCategoria: string): Observable<{ links: ILinksResponse[]; total: number }> {
    let params = new HttpParams()
      .set('page', pageIndex.toString())
      .set('limit', pageSize.toString())
      .set('categoria', itemCategoria);
    return this.http.get<{ links: ILinksResponse[]; total: number }>(`${this.urbase}/api/atividades`, { params,
      headers: this.authHeaders()
     });
  }
  getLink(id: number): Observable<ILinksResponse> {
    return this.http.get<ILinksResponse>(`${this.urbase}/api/atividades/${id}`, {
      headers: this.authHeaders()
    });
  }
  postLink(request: ILinkRequest): Observable<ILinksResponse> {
    const auxRequest = {
      name: request.name,
      uri: request.uri,
      categoria: request.categoria,
      subCategoria: request.subCategoria,
      descricao: request.descricao,
      tag: request.tag,
      fileID: request.fileID,
      dataEntradaManha: request.dataEntradaManha,
      dataSaidaManha: request.dataSaidaManha,
      dataEntradaTarde: request.dataEntradaTarde,
      dataSaidaTarde: request.dataSaidaTarde,
      dataEntradaNoite: request.dataEntradaNoite,
      dataSaidaNoite: request.dataSaidaNoite
    }
    return this.http.post<ILinksResponse>(`${this.urbase}/api/atividades`, auxRequest, {
      headers: this.authHeaders()
    });
  }
  putLink(request: ILinkRequest): Observable<ILinksResponse> {
    const auxRequest = {
      name: request.name,
      uri: request.uri,
      categoria: request.categoria,
      subCategoria: request.subCategoria,
      descricao: request.descricao,
      tag: request.tag,
      fileID: request.fileID,
      dataEntradaManha: request.dataEntradaManha,
      dataSaidaManha: request.dataSaidaManha,
      dataEntradaTarde: request.dataEntradaTarde,
      dataSaidaTarde: request.dataSaidaTarde,
      dataEntradaNoite: request.dataEntradaNoite,
      dataSaidaNoite: request.dataSaidaNoite
    }
    return this.http.put<ILinksResponse>(`${this.urbase}/api/atividades/${request.id}`, auxRequest, {
      headers: this.authHeaders().set('content-type', 'application/json')
    });
  }

  deleteItem(payload: { linkId: number; fileIds: number[] }): Observable<void> {
    return this.http.post<void>(
      `${environment.bffUrl}/api/atividades/delete`,
      payload,
      { withCredentials: true }
    );
  }

  deleteLink(id: number): Observable<ILinksResponse> {
    return this.http.delete<ILinksResponse>(`${this.urbase}/api/atividades/${id}`, {
      headers: this.authHeaders()
    });
  }
  calcularHoras(entrada: string | number | Date, saida: string | number | Date): number {
    const start = new Date(entrada).getTime();
    const end = new Date(saida).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return 0;
    }
    const diffMs = end - start;                   // diferença em milissegundos
    return diffMs / (1000 * 60 * 60);             // converte para horas
  }

  totalHorasTimeSheet(reg: readonly Partial<ILinksResponse>[]): number {
    let total = 0;
    reg.forEach((e) => {
      total += this.calcularHoras(e.dataEntradaManha ?? '', e.dataSaidaManha ?? '');
      total += this.calcularHoras(e.dataEntradaTarde ?? '', e.dataSaidaTarde ?? '');
      total += this.calcularHoras(e.dataEntradaNoite ?? '', e.dataSaidaNoite ?? '');
    });
    return total;
  }
}
