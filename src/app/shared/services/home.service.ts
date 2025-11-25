import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ILinkRequest } from 'src/app/shared/request/request';
import { ILinksResponse } from 'src/app/shared/response/response';

const token = localStorage.getItem('token');

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private urbase = 'http://localhost:8080';
  constructor(
    private http: HttpClient,
  ) { }
  carregaConteudo(urlTarget: string): Observable<any> {
    return this.http.get(`${this.urbase}/proxy?url=${urlTarget}`, { responseType: 'text' });
  }
  getLinks(pageIndex: number, pageSize: number, excessao: any[], categoria: string, tag: string): Observable<{ links: ILinksResponse[]; total: number }> {
    let params = new HttpParams()
    .set('page', pageIndex.toString())
    .set('limit', pageSize.toString())
    .set('categoria', categoria)
    .set('tag', tag);
    excessao.forEach((item: any) => {
      params = params.append('excessao', item);
    });
    return this.http.get<{ links: ILinksResponse[]; total: number }>(`${this.urbase}/api/atividades`, { params, 
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}` 
      })
     } );
  }
  //** Monta lista de Dropdown */
  getCategorias(): Observable<ILinksResponse> {
    return this.http.get<ILinksResponse>(`${this.urbase}/api/atividades/categorias`, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}` 
      })
    });
  }
  getTags(): Observable<ILinksResponse> {
    return this.http.get<ILinksResponse>(`${this.urbase}/api/atividades/tags`, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}` 
      })
    });
  }
  //** ao selecionar o item no dropdown */
  getSearchCategoria(pageIndex: number, pageSize: number, itemCategoria: string): Observable<{ links: ILinksResponse[]; total: number }> {
    let params = new HttpParams()
      .set('page', pageIndex.toString())
      .set('limit', pageSize.toString())
      .set('categoria', itemCategoria);
    return this.http.get<{ links: ILinksResponse[]; total: number }>(`${this.urbase}/api/atividades`, { params,
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}` 
      })
     });
  }
  getLink(id: number): Observable<ILinksResponse> {
    return this.http.get<ILinkRequest>(`${this.urbase}/api/atividades/${id}`, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}` 
      })
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
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}` 
      })
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
    return this.http.put<ILinksResponse>(`${this.urbase}/api/atividades/${request.id}`, request, {
      headers: new HttpHeaders({
        'content-type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    });
  }
  deleteLink(id: number): Observable<ILinksResponse> {
    return this.http.delete<ILinksResponse>(`${this.urbase}/api/atividades/${id}`, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}` 
      })
    });
  }
  calcularHoras(entrada: any, saida: any): number {
    const start = new Date(entrada).getTime();
    const end = new Date(saida).getTime();
    const diffMs = end - start;                   // diferença em milissegundos
    return diffMs / (1000 * 60 * 60);             // converte para horas
  }
  totalHorasTimeSheet(reg: any): number {
    let total = 0;
    reg.forEach((e: any) => {
      total += this.calcularHoras(e.dataEntradaManha, e.dataSaidaManha);
      total += this.calcularHoras(e.dataEntradaTarde, e.dataSaidaTarde);
      total += this.calcularHoras(e.dataEntradaNoite, e.dataSaidaNoite);
    });
    return total;
  }
}