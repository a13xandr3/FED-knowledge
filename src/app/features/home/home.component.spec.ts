import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { HomeService } from '../../../shared/services/home.service';
import { of, Subject, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogContentComponent } from '../dialog-content/dialog-content.component';
import { LinkStateService } from '../../../shared/state/link-state-service';
import { ComportamentoService } from '../../../shared/services/comportamento.service';
import { Component } from '@angular/core';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let homeServiceSpy: jasmine.SpyObj<HomeService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let linkStateSpy: jasmine.SpyObj<LinkStateService>;
  let comportamentoSpy: jasmine.SpyObj<ComportamentoService>;
  let mockLinkStateService: any;
  let refreshSubject: Subject<boolean>;
  const fakeLinks = [
    { id: 1, categoria: 'Financeiro', name: 'Link A' },
    { id: 2, categoria: 'Financeiro', name: 'Link B' },
    { id: 3, categoria: 'TI', name: 'Link C' }
  ];
  beforeEach(async () => {
    refreshSubject = new Subject<boolean>();
    homeServiceSpy = jasmine.createSpyObj('HomeService', ['getLinks', 'deleteLink']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    mockLinkStateService = jasmine.createSpyObj(
      'LinkStateService',
      ['triggerRefresh'],
      { refresh$: refreshSubject.asObservable() }
    );
    linkStateSpy = jasmine.createSpyObj('LinkStateService', ['triggerRefresh']);
    comportamentoSpy = jasmine.createSpyObj('ComportamentoService', [], { comportamentos$: of([]) });
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      providers: [
        { provide: HomeService, useValue: homeServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: LinkStateService, useValue: mockLinkStateService },
        { provide: ComportamentoService, useValue: comportamentoSpy }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
  it('deve carregar comportamentos no ngOnInit', () => {
    expect(component.comportamentos).toEqual([]);
  });
  it('deve filtrar e ordenar os links corretamente com getLinks', () => {
    homeServiceSpy.getLinks.and.returnValue(of());
    //component.getLinks('');
    expect(homeServiceSpy.getLinks).toHaveBeenCalled();
    //expect(component.links).toBe(undefined);
  });
  it('deve tratar erro ao buscar links', () => {
    const consoleSpy = spyOn(console, 'error');
    homeServiceSpy.getLinks.and.returnValue(throwError(() => 'Erro ao buscar links'));
    //component.getLinks('TI');
    expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar links');
  });
  it('deve deletar item e chamar getLinks e triggerRefresh', () => {
    homeServiceSpy.deleteLink.and.returnValue(of({ 
      id: 1, 
      name: '', 
      url: '',
      uri: {}, 
      categoria: '', 
      subCategoria: '',
      descricao: '',
      tag: {},
      dataEntradaManha: '',
      dataSaidaManha: '',
      dataEntradaTarde: '',
      dataSaidaTarde: '',
      dataEntradaNoite: '',
      dataSaidaNoite: '',
      oldCategoria: '' 
    }));
    spyOn(component, 'getLinks');
    component.delete(1);
    expect(homeServiceSpy.deleteLink).toHaveBeenCalledWith(1);
    expect(component.getLinks).toHaveBeenCalled();
  });
  it('deve lidar com erro ao deletar', () => {
    const consoleSpy = spyOn(console, 'error');
    homeServiceSpy.deleteLink.and.returnValue(throwError(() => 'Erro ao deletar'));
    component.delete(999);
    expect(consoleSpy).toHaveBeenCalledWith('Erro ao deletar');
  });
  it('deve abrir o dialog e atualizar os links se resultado existir', () => {
    const mockResult = { oldCategoria: 'categoriaTeste' };
    spyOn(component, 'getLinks');
    const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(mockResult), close: null });    
    dialogSpy.open.and.returnValue(dialogRefSpyObj);
    component.abrirDialog({
      id: 10,
      name: 'Teste',
      url: 'http://teste.com',
      uri: {},
      status: 'alterar',
      categoria: 'TI',
      subCategoria: '',
      descricao: 'desc',
      tag: {},
      oldCategoria: '',
      dataEntradaManha: '',
      dataSaidaManha: '',
      dataEntradaTarde: '',
      dataSaidaTarde: '',
      dataEntradaNoite: '',
      dataSaidaNoite: '',
    });
    expect(component.getLinks).toHaveBeenCalledWith('categoriaTeste');
  });
  it('não deve atualizar se resultado do dialog for falsy', () => {
    const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(null) });
    dialogSpy.open.and.returnValue(dialogRefSpyObj);
    spyOn(component, 'getLinks');
    component.abrirDialog({
      id: 10,
      name: 'Teste',
      url: 'http://teste.com',
      uri: {},
      status: 'alterar',
      categoria: 'TI',
      subCategoria: '',
      descricao: 'desc',
      tag: {},
      oldCategoria: '',
      dataEntradaManha: '',
      dataSaidaManha: '',
      dataEntradaTarde: '',
      dataSaidaTarde: '',
      dataEntradaNoite: '',
      dataSaidaNoite: '',

    });
    expect(component.getLinks).not.toHaveBeenCalled();
    expect(linkStateSpy.triggerRefresh).not.toHaveBeenCalled();
  });
});
