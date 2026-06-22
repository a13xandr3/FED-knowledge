import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HomeService } from './home.service';
import { ILinkRequest } from 'src/app/shared/request/request';

describe('HomeService', () => {
  let service: HomeService;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:8080/api/atividades';
  const mockLinkRequest: ILinkRequest = {
    id: 1,
    name: 'Teste',
    uri: { uris: [] },
    categoria: 'Categoria A',
    descricao: 'Descricao do link',
    subCategoria: 'teste',
    tag: { tags: ['teste'] },
    oldCategoria: 'Categoria A',
    dataEntradaManha: '',
    dataSaidaManha: '',
    dataEntradaTarde: '',
    dataSaidaTarde: '',
    dataEntradaNoite: '',
    dataSaidaNoite: '',
    horas: '',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HomeService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(HomeService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('deve retornar lista de links ao chamar getLinks()', () => {
    localStorage.setItem('kb_token', 'kb-token');
    const mockResponse = { links: [mockLinkRequest], total: 1 };

    service.getLinks(0, 10, ['x'], 'cat', 'tag').subscribe(data => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(r =>
      r.url === apiUrl &&
      r.params.get('page') === '0' &&
      r.params.get('limit') === '10' &&
      r.params.get('categoria') === 'cat' &&
      r.params.get('tag') === 'tag' &&
      r.params.getAll('excessao')?.includes('x') === true
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer kb-token');
    req.flush(mockResponse);
  });

  it('deve carregar conteudo textual por proxy', () => {
    service.carregaConteudo('http://site.com').subscribe(data => {
      expect(data).toBe('html');
    });

    const req = httpMock.expectOne('http://localhost:8080/proxy?url=http://site.com');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('text');
    req.flush('html');
  });

  it('deve carregar categorias e tags', () => {
    localStorage.setItem('token', 'legacy-token');

    service.getCategorias().subscribe(data => expect(data).toEqual(['TI'] as any));
    const reqCategorias = httpMock.expectOne(`${apiUrl}/categorias`);
    expect(reqCategorias.request.method).toBe('GET');
    expect(reqCategorias.request.headers.get('Authorization')).toBe('Bearer legacy-token');
    reqCategorias.flush(['TI']);

    service.getTags().subscribe(data => expect(data).toEqual(['angular'] as any));
    const reqTags = httpMock.expectOne(`${apiUrl}/tags`);
    expect(reqTags.request.method).toBe('GET');
    expect(reqTags.request.headers.get('Authorization')).toBe('Bearer legacy-token');
    reqTags.flush(['angular']);
  });

  it('deve buscar por categoria selecionada', () => {
    service.getSearchCategoria(1, 5, 'TI').subscribe(data => {
      expect(data).toEqual({ links: [], total: 0 });
    });

    const req = httpMock.expectOne(r =>
      r.url === apiUrl &&
      r.params.get('page') === '1' &&
      r.params.get('limit') === '5' &&
      r.params.get('categoria') === 'TI'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ links: [], total: 0 });
  });

  it('deve retornar um único link ao chamar getLink()', () => {
    service.getLink(1).subscribe(data => {
      expect(data).toEqual(mockLinkRequest);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLinkRequest);
  });

  it('deve enviar um novo link ao chamar postLink()', () => {
    service.postLink(mockLinkRequest).subscribe(data => {
      expect(data).toEqual(mockLinkRequest);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe(mockLinkRequest.name);
    expect(req.request.body.horas).toBeUndefined();
    req.flush(mockLinkRequest);
  });

  it('deve atualizar um link ao chamar putLink()', () => {
    service.putLink(mockLinkRequest).subscribe(data => {
      expect(data).toEqual(mockLinkRequest);
    });

    const req = httpMock.expectOne(`${apiUrl}/${mockLinkRequest.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.name).toBe(mockLinkRequest.name);
    expect(req.request.body.horas).toBeUndefined();
    req.flush(mockLinkRequest);
  });

  it('deve excluir um link ao chamar deleteLink()', () => {
    service.deleteLink(1).subscribe(data => {
      expect(data).toEqual(mockLinkRequest);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockLinkRequest);
  });

  it('deve excluir item por payload de link e arquivos', () => {
    const payload = { linkId: 1, fileIds: [10, 20] };

    service.deleteItem(payload).subscribe(response => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/delete`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });

  it('deve calcular horas validas e retornar zero para datas invalidas', () => {
    expect(service.calcularHoras('2026-01-01T08:00:00', '2026-01-01T10:30:00')).toBe(2.5);
    expect(service.calcularHoras('', '2026-01-01T10:30:00')).toBe(0);
  });

  it('deve somar horas de timesheet em todos os periodos', () => {
    const total = service.totalHorasTimeSheet([
      {
        dataEntradaManha: '2026-01-01T08:00:00',
        dataSaidaManha: '2026-01-01T10:00:00',
        dataEntradaTarde: '2026-01-01T13:00:00',
        dataSaidaTarde: '2026-01-01T15:30:00',
        dataEntradaNoite: '2026-01-01T20:00:00',
        dataSaidaNoite: '2026-01-01T21:00:00',
      },
      {},
    ]);

    expect(total).toBe(5.5);
  });
});
