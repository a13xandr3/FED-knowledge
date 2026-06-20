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
    uri: {},
    categoria: 'Categoria A',
    descricao: 'Descricao do link',
    subCategoria: 'teste',
    tag: { teste: 'teste' },
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
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('deve retornar lista de links ao chamar getLinks()', () => {
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
    req.flush(mockResponse);
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
});
