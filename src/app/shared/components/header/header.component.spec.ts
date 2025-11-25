import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { DialogContentComponent } from 'src/app/shared/components/dialog-content/dialog-content.component';
import { ILinkRequest } from 'src/app/shared/request/request';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let mockHomeService: jasmine.SpyObj<HomeService>;
  let mockLinkStateService: jasmine.SpyObj<LinkStateService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  let refreshSubject: Subject<void>;

  beforeEach(async () => {
    mockHomeService = jasmine.createSpyObj('HomeService', ['getLinks']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockLinkStateService = jasmine.createSpyObj('LinkStateService', ['triggerRefresh'], {
      refresh$: new Subject<void>()
    });
    //refreshSubject = mockLinkStateService.refresh$ as Subject<void>;
    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      providers: [
        { provide: HomeService, useValue: mockHomeService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: LinkStateService, useValue: mockLinkStateService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });
  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
  it('deve carregar categorias ao iniciar', () => {
    const mockLinks: ILinkRequest = 
      { id: 1, 
        name: 'Link 1', 
        uri: {}, 
        categoria: 'A', 
        descricao: 'desc',
        tag: {},
        subCategoria: '', 
        oldCategoria: '',
        dataEntradaManha: '',
        dataSaidaManha: '',
        dataEntradaTarde: '',
        dataSaidaTarde: '',
        dataEntradaNoite: '',
        dataSaidaNoite: '',
        horas: null
        
      };
    //mockHomeService.getLinks.and.returnValue(of(mockLinks));
    fixture.detectChanges(); // chama ngOnInit()
    expect(mockHomeService.getLinks).toHaveBeenCalled();
    //expect(component.items).toEqual(undefined);
  });
  it('deve emitir evento ao alterar seleção', () => {
    spyOn(component.itemSelecionadoEvent, 'emit');
    //component.onChange('Categoria A');
    expect(component.itemSelecionadoEvent.emit).toHaveBeenCalledWith('Categoria A');
  });
  it('deve retornar categoria selecionada em publicaItem()', () => {
    //component.selectedItem = 'Categoria B';
    //expect(component.publicaItem()).toBe('Categoria B');
  });
  it('deve abrir o dialog e disparar triggerRefresh se categoria estiver no resultado', () => {
    const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<DialogContentComponent>>('MatDialogRef', ['afterClosed']);
    mockDialog.open.and.returnValue(dialogRefSpy);
    dialogRefSpy.afterClosed.and.returnValue(of({ categoria: 'Nova Categoria' }));
    component.abrirDialog();
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockLinkStateService.triggerRefresh).toHaveBeenCalled();
  });

  xit('não deve chamar triggerRefresh se resultado do dialog não tiver categoria', () => {
    const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<DialogContentComponent>>('MatDialogRef', ['afterClosed']);
    mockDialog.open.and.returnValue(dialogRefSpy);
    dialogRefSpy.afterClosed.and.returnValue(of({}));
    component.abrirDialog();
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockLinkStateService.triggerRefresh).not.toHaveBeenCalled();
  });

  it('deve recarregar categorias quando refresh$ for emitido', () => {
    mockHomeService.getLinks.and.returnValue(of());
    fixture.detectChanges(); // chama ngOnInit()
    //refreshSubject.next(); // simula evento de refresh
    expect(mockHomeService.getLinks).toHaveBeenCalledTimes(2); // um no init e um no refresh$
  });
});
