import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { of, throwError } from 'rxjs';

import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { ILinkRequest } from 'src/app/shared/request/request';
import { HomeService } from 'src/app/shared/services/home.service';
import { DialogContentComponent } from './dialog-content.component';

describe('DialogContentComponent', () => {
  let component: DialogContentComponent;
  let fixture: ComponentFixture<DialogContentComponent>;
  let mockService: jasmine.SpyObj<HomeService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DialogContentComponent>>;
  let mockStateService: jasmine.SpyObj<LinkStateService>;
  const mockData = {
    id: 1,
    name: 'Link de Teste',
    url: 'http://teste.com',
    categoria: 'Teste',
    descricao: 'Descrição teste',
    oldCategoria: 'Antiga',
    status: 'inclusao'
  };
  beforeEach(async () => {
    mockService = jasmine.createSpyObj('HomeService', ['postLink', 'putLink']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockStateService = jasmine.createSpyObj('LinkStateService', ['triggerRefresh']);
    await TestBed.configureTestingModule({
      declarations: [DialogContentComponent],
      imports: [
        ReactiveFormsModule,
        FormsModule,
        BrowserAnimationsModule, // Necessário para vários componentes do Material
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatButtonModule
      ],
      providers: [
        FormBuilder,
        { provide: HomeService, useValue: mockService },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: LinkStateService, useValue: mockStateService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
  it('deve inicializar o formulário com os dados recebidos', () => {
    expect(component.fr.get('name')?.value).toBe('Link de Teste');
    expect(component.fr.get('url')?.value).toBe('http://teste.com');
  });
  it('deve chamar fechar() e fechar o diálogo', () => {
    component.fechar();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
  xit('deve chamar setSalvar() se status for "inclusao"', () => {
    component.data.status = 'inclusao';
    const postSpy = spyOn(mockService, 'postLink').and.returnValue(of());
    const snackbarSpy = spyOn(mockSnackBar, 'open');
    const triggerSpy = spyOn(mockStateService, 'triggerRefresh');
    component.fr.setValue({ titulo: 'Card', link: 'http://exemplo.com' });
    //component.setSalvar(mockData);
    expect(postSpy).toHaveBeenCalled();
    expect(snackbarSpy).toHaveBeenCalledWith(
      'Car Inserido com sucesso!',
      'Fechar',
      { duration: 5000, verticalPosition: 'top', horizontalPosition: 'right' }
    );
    expect(triggerSpy).toHaveBeenCalled();
  });
  it('deve chamar putAtualizar() se status for diferente de "inclusao"', () => {
    component.data.status = 'edicao';
    const putResponse = of({
      id: 1,
      name: 'Link válido',
      uri: [''],
      categoria: 'Teste',
      descricao: 'Descrição de teste',
      oldCategoria: 'Categoria antiga'
    } as ILinkRequest);
    mockService.putLink.and.returnValue(putResponse);
    component.salvar();
    expect(mockService.putLink).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Card Atualizado com sucesso!',
      'Fechar',
      { duration: 5000, verticalPosition: 'top', horizontalPosition: 'right' }
    );
    expect(mockStateService.triggerRefresh).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
  xit('deve lidar com erro no postLink', () => {
    mockService.postLink.and.returnValue(throwError(() => new Error('Erro no POST')));
    spyOn(console, 'log');
    component.salvar();
    expect(console.log).toHaveBeenCalledWith(jasmine.any(Error));
  });
  it('deve lidar com erro no putLink', () => {
    component.data.status = 'edicao';
    mockService.putLink.and.returnValue(throwError(() => new Error('Erro no PUT')));
    spyOn(console, 'log');
    component.salvar();
    expect(console.log).toHaveBeenCalledWith(jasmine.any(Error));
  });
  it('deve chamar mostrarMensagem corretamente', () => {
    //component.mostrarMensagem('Teste');
    expect(mockSnackBar.open).toHaveBeenCalledWith('Teste', 'Fechar', {
      duration: 5000,
      verticalPosition: 'top',
      horizontalPosition: 'right'
    });
  });
});
