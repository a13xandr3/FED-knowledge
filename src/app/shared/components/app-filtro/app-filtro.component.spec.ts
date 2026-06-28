import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { AppFiltroComponent } from './app-filtro.component';
import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { FiltroSelecionado } from 'src/app/shared/interfaces/filtro-selecionado.interface';

describe('AppFiltroComponent', () => {
  let component: AppFiltroComponent;
  let fixture: ComponentFixture<AppFiltroComponent>;
  let refreshSubject: BehaviorSubject<boolean>;
  let homeService: { getCategorias: jest.Mock; getTags: jest.Mock };
  let snackService: { mostrarMensagem: jest.Mock };

  beforeEach(async () => {
    refreshSubject = new BehaviorSubject<boolean>(false);
    homeService = {
      getCategorias: jest.fn().mockReturnValue(of(['TI'])),
      getTags: jest.fn().mockReturnValue(of(['angular'])),
    };
    snackService = {
      mostrarMensagem: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AppFiltroComponent],
      providers: [
        { provide: HomeService, useValue: homeService },
        { provide: LinkStateService, useValue: { refreshLink$: refreshSubject.asObservable() } },
        { provide: SnackService, useValue: snackService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppFiltroComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar categorias e tags ao iniciar', () => {
    fixture.detectChanges();

    expect(homeService.getCategorias).toHaveBeenCalledTimes(1);
    expect(homeService.getTags).toHaveBeenCalledTimes(1);
    expect(component.categoriaOptions().map(opt => opt.value)).toEqual(['todos', 'TI']);
    expect(component.tagOptions().map(opt => opt.value)).toEqual(['todos', 'angular']);
  });

  it('deve emitir o filtro selecionado', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.filtroSelecionado, 'emit');

    component.categoryCtrl.setValue({ value: 'TI', label: 'TI' });
    component.categoryCtrl.setValue({ value: 'todos', label: 'todos' });
    component.tagCtrl.setValue({ value: 'angular', label: 'angular' });

    expect(emitSpy).toHaveBeenCalledWith({ tipo: 'categoria', valor: 'TI' });
    expect(emitSpy).toHaveBeenCalledWith({ tipo: 'tag', valor: 'angular' });
  });

  it('deve desabilitar tags ao selecionar categoria especifica e reabilitar com todos', () => {
    fixture.detectChanges();

    component.categoryCtrl.setValue({ value: 'TI', label: 'TI' });

    expect(component.tagCtrl.disabled).toBe(true);

    component.categoryCtrl.setValue({ value: 'todos', label: 'todos' });

    expect(component.tagCtrl.enabled).toBe(true);
  });

  it('deve desabilitar categorias ao selecionar tag especifica e reabilitar com todos', () => {
    fixture.detectChanges();

    component.tagCtrl.setValue({ value: 'angular', label: 'angular' });

    expect(component.categoryCtrl.disabled).toBe(true);

    component.tagCtrl.setValue({ value: 'todos', label: 'todos' });

    expect(component.categoryCtrl.enabled).toBe(true);
  });

  it('deve sincronizar tag selecionada externamente sem reemitir filtro', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.filtroSelecionado, 'emit');

    fixture.componentRef.setInput(
      'selectedFilter',
      { tipo: 'tag', valor: 'angular' } satisfies FiltroSelecionado
    );
    fixture.detectChanges();

    expect(component.tagCtrl.value?.value).toBe('angular');
    expect(component.categoryCtrl.value?.value).toBe('todos');
    expect(component.categoryCtrl.disabled).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('nao deve emitir filtro quando valor selecionado for vazio', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.filtroSelecionado, 'emit');

    component.categoryCtrl.setValue({ value: '', label: '' });

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('deve recarregar opções quando refreshLink$ emitir', () => {
    fixture.detectChanges();
    refreshSubject.next(true);

    expect(homeService.getCategorias).toHaveBeenCalledTimes(2);
    expect(homeService.getTags).toHaveBeenCalledTimes(2);
  });

  it('deve exibir mensagem em caso de erro', () => {
    homeService.getCategorias.mockReturnValue(throwError(() => new Error('erro categorias')));
    homeService.getTags.mockReturnValue(throwError(() => new Error('erro tags')));

    fixture.detectChanges();

    expect(snackService.mostrarMensagem).toHaveBeenCalledWith('erro categorias', 'Fechar');
    expect(snackService.mostrarMensagem).toHaveBeenCalledWith('erro tags', 'Fechar');
  });
});
