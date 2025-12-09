import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { HomeComponent } from './home.component';
import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { ComportamentoService } from 'src/app/shared/services/comportamento.service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

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

describe('HomeComponent (standalone + Jest)', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // standalone component: entra em imports, não em declarations
      imports: [
        HomeComponent,
        NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MatDialog, useValue: matDialogMock },
        { provide: ComportamentoService, useValue: comportamentoServiceMock },
        { provide: LinkStateService, useValue: linkStateServiceMock },
        { provide: HomeService, useValue: homeServiceMock },
        { provide: SnackService, useValue: snackServiceMock },
      ],
    }).compileComponents();

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

    expect(component.itemModificadoCategoria).toBe('');
    expect(component.itemModificadoTag).toBe('tagImportante');
    expect(spyGetLinks).toHaveBeenCalled();
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

  it('getTags deve extrair tags corretamente de diferentes formatos', () => {
    const fromWrapper = component.getTags({ tags: ['a', 'b'] });
    const fromArray = component.getTags([{ tags: ['c'] }, { tags: ['d', 'e'] }]);
    const empty = component.getTags(null);

    expect(fromWrapper).toEqual(['a', 'b']);
    expect(fromArray).toEqual(['c', 'd', 'e']);
    expect(empty).toEqual([]);
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

  it('resetPaginador deve resetar pageIndex/pageSize e chamar firstPage do paginator quando existir', () => {
    const firstPageSpy = jest.fn();
    (component as any).paginator = { firstPage: firstPageSpy };

    component.resetPaginador();

    expect(component.pageIndex).toBe(0);
    expect(component.pageSize).toBe(10);
    expect(firstPageSpy).toHaveBeenCalled();
  });
});
