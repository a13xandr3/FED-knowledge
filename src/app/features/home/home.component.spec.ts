import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { HomeComponent } from './home.component';
import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { ComportamentoService } from 'src/app/shared/services/comportamento.service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AuthService } from 'src/app/shared/services/auth.service';

// ---- Mocks de serviços ----

const comportamentos$ = of([]);

const refreshSubject = new Subject<boolean>();

const comportamentoServiceMock = {
  comportamentos$,
};

const linkStateServiceMock = {
  refreshLink$: refreshSubject.asObservable(),
  triggerRefresh: jest.fn(),
};

const homeServiceMock = {
  getLinks: jest.fn(),
  deleteItem: jest.fn(),
  totalHorasTimeSheet: jest.fn(),
  getCategorias: jest.fn().mockReturnValue(of([])),
  getTags: jest.fn().mockReturnValue(of([])),
};

const snackServiceMock = {
  mostrarMensagem: jest.fn(),
};

const matDialogMock = {
  open: jest.fn().mockReturnValue({
    afterClosed: () => of(true),
    close: jest.fn(),
  }),
};

const activatedRouteMock = {
  queryParams: of({ titulo: 'Título via rota' }),
};

const authServiceMock = {
  isAuthenticated: jest.fn().mockReturnValue(true),
  logout: jest.fn(),
};

const routerMock = {
  navigate: jest.fn().mockResolvedValue(true),
};

describe('HomeComponent (standalone + Jest)', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // standalone component: entra em imports, não em declarations
      imports: [
        HomeComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MatDialog, useValue: matDialogMock },
        { provide: ComportamentoService, useValue: comportamentoServiceMock },
        { provide: LinkStateService, useValue: linkStateServiceMock },
        { provide: HomeService, useValue: homeServiceMock },
        { provide: SnackService, useValue: snackServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    })
    .overrideProvider(MatDialog, { useValue: matDialogMock })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;

    // evita chamadas reais para paginator.firstPage() durante os testes
    (component as any).paginator = {
      firstPage: jest.fn(),
    };

    fixture.detectChanges(); // dispara ngOnInit
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar o componente e inicializar com valores padrão', () => {
    expect(component).toBeTruthy();
    expect(component.titulo).toBe('Título via rota');
    expect(component.pageIndex).toBe(0);
    expect(component.pageSize).toBe(10);
  });

  it('injectUrl deve priorizar url e depois uri.uris[0]', () => {
    expect(component.injectUrl({ url: 'http://exemplo.com' })).toBe('http://exemplo.com');
    expect(
      component.injectUrl({ uri: { uris: ['http://primeira.com', 'http://segunda.com'] } })
    ).toBe('http://primeira.com');
    expect(component.injectUrl(null)).toBe('');
  });

  it('onItemSelecionado com categoria deve ajustar filtros e chamar getLinks', () => {
    homeServiceMock.getLinks.mockReturnValue(of({ atividades: [], total: 0 }));

    const spyGetLinks = jest.spyOn(component, 'getLinks');

    component.onItemSelecionado('financeiro_categoria');

    expect(component.selectedFilter).toEqual({ tipo: 'categoria', valor: 'financeiro' });
    expect(component.itemModificadoCategoria).toBe('financeiro');
    expect(component.itemModificadoTag).toBe('');
    expect(component.pageIndex).toBe(0);
    expect(component.pageSize).toBe(10);
    expect(spyGetLinks).toHaveBeenCalled();
  });

  it('onItemSelecionado com tag deve ajustar filtros e chamar getLinks', () => {
    homeServiceMock.getLinks.mockReturnValue(of({ atividades: [], total: 0 }));

    const spyGetLinks = jest.spyOn(component, 'getLinks');

    component.onItemSelecionado('tagImportante_tag');

    expect(component.selectedFilter).toEqual({ tipo: 'tag', valor: 'tagImportante' });
    expect(component.itemModificadoCategoria).toBe('');
    expect(component.itemModificadoTag).toBe('tagImportante');
    expect(spyGetLinks).toHaveBeenCalled();
  });

  it('onItemSelecionado deve converter "todos" para filtro vazio', () => {
    homeServiceMock.getLinks.mockReturnValue(of({ atividades: [], total: 0 }));

    component.onItemSelecionado('todos_categoria');
    expect(component.selectedFilter).toEqual({ tipo: 'categoria', valor: 'todos' });
    expect(component.itemModificadoCategoria).toBe('');
    expect(component.itemModificadoTag).toBe('');

    component.onItemSelecionado('todos_tag');
    expect(component.selectedFilter).toEqual({ tipo: 'tag', valor: 'todos' });
    expect(component.itemModificadoCategoria).toBe('');
    expect(component.itemModificadoTag).toBe('');
  });

  it('getLinks deve popular links e totalLinks (cenário não-timesheet)', () => {
    const resposta = {
      atividades: [
        { id: 2, name: 'B', categoria: 'outra' },
        { id: 1, name: 'A', categoria: 'outra' },
      ],
      total: 2,
    };

    homeServiceMock.getLinks.mockReturnValue(of(resposta));

    component.pageIndex = 0;
    component.pageSize = 10;

    component.getLinks();

    expect(homeServiceMock.getLinks).toHaveBeenCalled();
    // ordenado por name
    expect(component.links[0].name).toBe('A');
    expect(component.links[1].name).toBe('B');
    expect(component.totalLinks).toBe(2);
    expect(component.totalHoras).toBeUndefined();
  });

  it('getLinks deve aceitar response.links quando atividades nao vier', () => {
    const resposta = {
      links: [
        { id: 1, name: 'B', categoria: 'outra' },
        { id: 2, name: 'A', categoria: 'outra' },
      ],
      total: 2,
    };

    homeServiceMock.getLinks.mockReturnValue(of(resposta));

    component.getLinks();

    expect(component.links.map(item => item.name)).toEqual(['A', 'B']);
    expect(component.totalLinks).toBe(2);
  });

  it('getLinks deve usar lista vazia quando response nao trouxer atividades nem links', () => {
    homeServiceMock.getLinks.mockReturnValue(of({ total: 0 }));

    component.getLinks();

    expect(component.links).toEqual([]);
    expect(component.totalLinks).toBe(0);
    expect(component.totalHoras).toBeUndefined();
  });

  it('getLinks deve calcular totalHoras quando categoria for timesheet', () => {
    const resposta = {
      atividades: [
        { id: 1, name: 'Atv 1', categoria: 'timesheet' },
        { id: 2, name: 'Atv 2', categoria: 'timesheet' },
      ],
      total: 2,
    };

    homeServiceMock.getLinks.mockReturnValue(of(resposta));
    homeServiceMock.totalHorasTimeSheet.mockReturnValue(123);

    component.pageIndex = 0;
    component.pageSize = 10;

    component.getLinks();

    expect(homeServiceMock.getLinks).toHaveBeenCalled();
    expect(homeServiceMock.totalHorasTimeSheet).toHaveBeenCalledWith(resposta.atividades);
    expect(component.totalHoras).toBe(123);
    expect(component.totalLinks).toBe(2);
  });

  it('getLinks deve chamar snackService.mostrarMensagem em caso de erro', () => {
    const erro = new HttpErrorResponse({ status: 500, statusText: 'Erro', url: '/api', error: 'X' });
    (homeServiceMock.getLinks as jest.Mock).mockReturnValue(
      throwError(() => erro)
    );

    component.getLinks();

    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith(
      erro.message,
      'Fechar'
    );
  });

  it('deleteItem deve montar payload correto e chamar serviços envolvidos', () => {
    (homeServiceMock.getLinks as jest.Mock).mockReturnValue(of({ atividades: [], total: 0 }));
    (homeServiceMock.deleteItem as jest.Mock).mockReturnValue(of(void 0));

    const linkId = 10;
    const fileRefs = [{ id: 1 }, { id: 2 }];

    component.deleteItem(linkId, fileRefs);

    expect(homeServiceMock.deleteItem).toHaveBeenCalledWith({
      linkId,
      fileIds: [1, 2],
    });
    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith(
      'Card e arquivo(s) excluídos com sucesso!',
      'Fechar'
    );
    expect(linkStateServiceMock.triggerRefresh).toHaveBeenCalled();
  });

  it('deleteItem deve aceitar numero unico e tratar erro', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'Falha' });
    (homeServiceMock.deleteItem as jest.Mock).mockReturnValue(throwError(() => error));

    component.deleteItem(10, 99);

    expect(homeServiceMock.deleteItem).toHaveBeenCalledWith({ linkId: 10, fileIds: [99] });
    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith(error.message, 'Fechar');
  });

  it('deleteItem deve usar mensagem generica quando erro nao tiver message', () => {
    (homeServiceMock.deleteItem as jest.Mock).mockReturnValue(throwError(() => ({})));

    component.deleteItem(10, []);

    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith('Falha ao excluir', 'Fechar');
  });

  it('deleteItem deve aceitar referencia nula', () => {
    (homeServiceMock.getLinks as jest.Mock).mockReturnValue(of({ atividades: [], total: 0 }));
    (homeServiceMock.deleteItem as jest.Mock).mockReturnValue(of(void 0));

    component.deleteItem(10, null);

    expect(homeServiceMock.deleteItem).toHaveBeenCalledWith({ linkId: 10, fileIds: [] });
  });

  it('getTags deve extrair tags corretamente de diferentes formatos', () => {
    const fromWrapper = component.getTags({ tags: ['a', 'b'] });
    const fromArray = component.getTags([{ tags: ['c'] }, { tags: ['d', 'e'] }]);
    const empty = component.getTags(null);

    expect(fromWrapper).toEqual(['a', 'b']);
    expect(fromArray).toEqual(['c', 'd', 'e']);
    expect(empty).toEqual([]);
    expect(component.getTags(['f', 'g'])).toEqual(['f', 'g']);
    expect(component.getTags({})).toEqual([]);
  });

  it('hasTags deve retornar true quando existirem tags', () => {
    expect(component.hasTags({ tags: ['x'] })).toBe(true);
    expect(component.hasTags(null)).toBe(false);
  });

  it('onPageChange deve atualizar pageIndex/pageSize e chamar getLinks', () => {
    homeServiceMock.getLinks.mockReturnValue(of({ atividades: [], total: 0 }));
    const spyGetLinks = jest.spyOn(component, 'getLinks');

    component.onPageChange({ pageIndex: 2, pageSize: 5, length: 0 } as any);

    expect(component.pageIndex).toBe(2);
    expect(component.pageSize).toBe(5);
    expect(spyGetLinks).toHaveBeenCalled();
  });

  it('deve calcular paginas visiveis e navegar entre paginas', () => {
    homeServiceMock.getLinks.mockReturnValue(of({ atividades: [], total: 42 }));
    const spyGetLinks = jest.spyOn(component, 'getLinks');

    component.totalLinks = 42;
    component.pageSize = 10;
    component.pageIndex = 2;

    expect(component.totalPages).toBe(5);
    expect(component.visiblePages).toEqual([0, 1, 2, 3, 4]);
    expect(component.isFirstPage).toBe(false);
    expect(component.isLastPage).toBe(false);

    component.goToPage(2);
    component.goToPage(-1);
    component.goToPage(5);
    expect(spyGetLinks).not.toHaveBeenCalled();

    component.goToFirstPage();
    expect(component.pageIndex).toBe(0);

    component.pageIndex = 2;
    component.goToPreviousPage();
    expect(component.pageIndex).toBe(1);

    component.goToNextPage();
    expect(component.pageIndex).toBe(2);

    component.goToLastPage();
    expect(component.pageIndex).toBe(4);
    expect(component.isLastPage).toBe(true);
    expect(spyGetLinks).toHaveBeenCalledTimes(4);
  });

  it('visiblePages deve deslocar janela quando houver mais de cinco paginas', () => {
    component.totalLinks = 100;
    component.pageSize = 10;
    component.pageIndex = 8;

    expect(component.visiblePages).toEqual([5, 6, 7, 8, 9]);
  });

  it('onChangeTag deve resetar paginador e selecionar tag', () => {
    homeServiceMock.getLinks.mockReturnValue(of({ atividades: [], total: 0 }));
    const resetSpy = jest.spyOn(component, 'resetPaginador');

    component.onChangeTag('angular_tag');

    expect(resetSpy).toHaveBeenCalled();
    expect(component.selectedFilter).toEqual({ tipo: 'tag', valor: 'angular' });
    expect(component.itemModificadoTag).toBe('angular');
  });

  it('deve reagir somente a refresh true', () => {
    homeServiceMock.getLinks.mockReturnValue(of({ atividades: [], total: 0 }));
    const spyGetLinks = jest.spyOn(component, 'getLinks');

    refreshSubject.next(false);
    refreshSubject.next(true);

    expect(spyGetLinks).toHaveBeenCalledTimes(1);
  });

  it('abrirDialog deve montar dados e atualizar lista quando houver resultado', () => {
    const dialogRef = {
      afterClosed: jest.fn().mockReturnValue(of({ id: 1 })),
      close: jest.fn(),
    };
    matDialogMock.open.mockReturnValue(dialogRef);
    homeServiceMock.totalHorasTimeSheet.mockReturnValue(2);
    homeServiceMock.getLinks.mockReturnValue(of({ atividades: [], total: 0 }));
    linkStateServiceMock.triggerRefresh.mockClear();

    component.abrirDialog({
      id: 1,
      name: 'Card',
      uri: { uris: ['http://site'] },
      categoria: 'TI',
      subCategoria: 'Angular',
      descricao: 'Descricao',
      tag: { tags: ['tag'] },
      fileID: { fileRefs: [{ id: 1, filename: 'a.txt' }] },
      status: 'alteracao',
      horas: '',
      dataEntradaManha: '2026-01-01T08:00:00',
      dataSaidaManha: '2026-01-01T09:00:00',
      dataEntradaTarde: '2026-01-01T13:00:00',
      dataSaidaTarde: '2026-01-01T14:00:00',
      dataEntradaNoite: '2026-01-01T20:00:00',
      dataSaidaNoite: '2026-01-01T21:00:00',
    } as any, true);

    expect(matDialogMock.open).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({
      data: expect.objectContaining({
        status: 'alteracao',
        showSite: true,
        totalHorasDia: 2,
      }),
    }));
    expect(linkStateServiceMock.triggerRefresh).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('abrirDialog nao deve atualizar lista quando fechar sem resultado', () => {
    const dialogRef = {
      afterClosed: jest.fn().mockReturnValue(of(null)),
      close: jest.fn(),
    };
    matDialogMock.open.mockReturnValue(dialogRef);
    homeServiceMock.totalHorasTimeSheet.mockReturnValue(0);
    const spyGetLinks = jest.spyOn(component, 'getLinks');

    component.abrirDialog({
      id: 1,
      name: 'Card',
      uri: { uris: [] },
      categoria: 'TI',
      subCategoria: '',
      descricao: '',
      tag: { tags: [] },
      fileID: { fileRefs: [] },
      status: 'alteracao',
      horas: '',
      dataEntradaManha: '',
      dataSaidaManha: '',
      dataEntradaTarde: '',
      dataSaidaTarde: '',
      dataEntradaNoite: '',
      dataSaidaNoite: '',
    } as any);

    expect(spyGetLinks).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('resetPaginador deve resetar pageIndex/pageSize e chamar firstPage do paginator quando existir', () => {
    const firstPageSpy = jest.fn();
    (component as any).paginator = { firstPage: firstPageSpy };

    component.resetPaginador();

    expect(component.pageIndex).toBe(0);
    expect(component.pageSize).toBe(10);
    expect(firstPageSpy).toHaveBeenCalled();
  });

  it('resetPaginador deve funcionar sem paginator', () => {
    (component as any).paginator = undefined;

    component.resetPaginador();

    expect(component.pageIndex).toBe(0);
    expect(component.pageSize).toBe(10);
  });
});
