import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of, throwError } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DialogContentComponent } from './dialog-content.component';
import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { LinkMapperService } from 'src/app/shared/services/link-mapper.service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { FilesPayload } from 'src/app/shared/components/input-file/file-selection.util';
import { PreviewItem } from 'src/app/types/Files';

// ngx-mask (standalone)
import { provideNgxMask, NGX_MASK_CONFIG } from 'ngx-mask';

// ---------- Mocks ----------
const homeServiceMock = {
  postLink: jest.fn(),
  putLink: jest.fn(),
};

const linkStateServiceMock = {
  triggerRefresh: jest.fn(),
};

const linkMapperServiceMock = {
  normalizeUris: jest.fn().mockReturnValue([]),
  normalizeTags: jest.fn().mockReturnValue([]),
  toDateBr: jest.fn((v: any) => v ?? ''),
  countdown: jest.fn().mockReturnValue(of(123456)), // stream simulado
  buildRequest: jest.fn().mockImplementation(
    (dados: any, tags: string[], uris: string[], filesPayload: FilesPayload) => ({
      ...dados,
      tags,
      uris,
      filesPayload,
    })
  ),
};

const snackServiceMock = {
  mostrarMensagem: jest.fn(),
};

const filesApiServiceMock = {
  buildPreviewsFromFileIds: jest.fn(),
  delete: jest.fn(),
  uploadOne: jest.fn(),
};

const matDialogRefMock = {
  close: jest.fn(),
};

const dialogDataMock: any = {
  id: 1,
  name: 'Card de teste',
  categoria: 'Timesheet',
  subCategoria: 'Dev',
  descricao: 'Descrição teste',
  status: 'inclusao',
  totalHorasDia: '08:00',
  fileID: [
    {
      fileRefs: [{ id: 10 }, { id: 20 }],
    },
  ],
};

describe('DialogContentComponent (standalone + Jest)', () => {
  let fixture: ComponentFixture<DialogContentComponent>;
  let component: DialogContentComponent;
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  const previewsMock: PreviewItem[] = [
    { id: 10, url: 'http://file-10', filename: 'file-10' } as any,
    { id: 20, url: 'http://file-20', filename: 'file-20' } as any,
  ];

  beforeEach(async () => {
    // limpa chamadas / implementações antes de configurar cada teste
    jest.clearAllMocks();

    // comportamento padrão dos mocks
    (homeServiceMock.postLink as jest.Mock).mockReturnValue(of(null));
    (homeServiceMock.putLink as jest.Mock).mockReturnValue(of(null));
    (filesApiServiceMock.buildPreviewsFromFileIds as jest.Mock).mockResolvedValue(previewsMock);
    (filesApiServiceMock.delete as jest.Mock).mockReturnValue(of(null));
    (filesApiServiceMock.uploadOne as jest.Mock).mockImplementation((_p: any) => of({ id: 999 }));

    await TestBed.configureTestingModule({
      imports: [
        DialogContentComponent, // standalone
        NoopAnimationsModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: HomeService, useValue: homeServiceMock },
        { provide: LinkStateService, useValue: linkStateServiceMock },
        { provide: LinkMapperService, useValue: linkMapperServiceMock },
        { provide: SnackService, useValue: snackServiceMock },
        { provide: FileApiService, useValue: filesApiServiceMock },
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: dialogDataMock },
        // ngx-mask config para a NgxMaskDirective usada pelo componente
        provideNgxMask({ validation: false }),
        { provide: NGX_MASK_CONFIG, useValue: { validation: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // dispara ngOnInit/constructor lifecycle
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    logSpy.mockRestore();
  });

  it('deve criar o componente e inicializar contagem regressiva/totalHorasDia', () => {
    expect(component).toBeTruthy();
    expect(linkMapperServiceMock.countdown).toHaveBeenCalledWith(86400000);
    expect(component.totalHorasDia).toBe(dialogDataMock.totalHorasDia);
  });

  it('deve inicializar form com dados vindos do MAT_DIALOG_DATA', () => {
    const raw = component.fr.getRawValue();
    expect(raw.id).toBe(dialogDataMock.id);
    expect(raw.name).toBe(dialogDataMock.name);
    expect(raw.categoria).toBe(dialogDataMock.categoria);
    expect(raw.descricao).toBe(dialogDataMock.descricao);
  });

  it('ngOnInit deve carregar previews e preencher controle fileID', async () => {
    await fixture.whenStable(); // aguarda promises do ngOnInit
    fixture.detectChanges();

    expect(filesApiServiceMock.buildPreviewsFromFileIds).toHaveBeenCalledWith([10, 20]);
    expect(component.previewsFromIds).toEqual(previewsMock);

    const fileIdCtrl = component.fr.get('fileID');
    expect(fileIdCtrl?.value).toEqual([10, 20]);
  });

  it('onProcessed deve adicionar arquivo na fila e em allFiles', () => {
    const processedFile: any = { filename: 'novo-arquivo.txt' };

    component.onProcessed(processedFile);

    const fileQueue = (component as any).fileQueue as any[];
    expect(fileQueue.length).toBe(1);
    expect(fileQueue[0].filename).toBe('novo-arquivo.txt');

    expect(component.allFiles.files.length).toBe(1);
    expect(component.allFiles.files[0]).toEqual({ id: -1, filename: 'novo-arquivo.txt' });
  });

  it('onClearedFiles deve limpar fila e lista de arquivos', () => {
    (component as any).fileQueue = [{ filename: 'a.txt' }] as any[];
    component.allFiles = { files: [{ id: 1, filename: 'a.txt' }] };

    component.onClearedFiles();

    expect((component as any).fileQueue.length).toBe(0);
    expect(component.allFiles.files.length).toBe(0);
  });

  it('onPreviewRemoved deve remover id tanto do form quanto do initialIds', () => {
    component.previewsFromIds = [{ id: 10, url: 'http://file-10', filename: 'file-10' } as any];
    component.fr.get('fileID')?.setValue([10]);
    (component as any).initialIds = [10];

    component.onPreviewRemoved(0);

    expect(component.fr.get('fileID')?.value).toEqual([]);
    expect((component as any).initialIds).toEqual([]);
  });

  it('salvar com form inválido não deve chamar serviços', () => {
    component.fr.setErrors({ qualquer: true });

    component.salvar();

    expect(homeServiceMock.postLink).not.toHaveBeenCalled();
    expect(homeServiceMock.putLink).not.toHaveBeenCalled();
    expect(linkStateServiceMock.triggerRefresh).not.toHaveBeenCalled();
    expect(matDialogRefMock.close).not.toHaveBeenCalled();
  });

  it('salvar (inclusão) deve postar, disparar refresh, fechar e limpar fila', () => {
    component.fr.setErrors(null);

    component.previewsFromIds = [{ id: 10, url: 'http://file-10', filename: 'file-10' } as any];
    (component as any).initialIds = [10];
    (component as any).fileQueue = [{ filename: 'novo-arquivo.txt' } as any];

    (filesApiServiceMock.uploadOne as jest.Mock).mockReturnValue(of({ id: 999 }));
    (homeServiceMock.postLink as jest.Mock).mockReturnValue(of(null));

    component.salvar();

    expect(linkMapperServiceMock.buildRequest).toHaveBeenCalled();
    expect(homeServiceMock.postLink).toHaveBeenCalledTimes(1);
    expect(homeServiceMock.putLink).not.toHaveBeenCalled();

    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith(
      'Card Inserido com sucesso!',
      'Fechar'
    );
    expect(linkStateServiceMock.triggerRefresh).toHaveBeenCalledTimes(1);
    expect(matDialogRefMock.close).toHaveBeenCalledTimes(1);
    expect((component as any).fileQueue.length).toBe(0);
  });

  it('salvar deve exibir mensagem de erro quando serviço retornar erro', () => {
    component.fr.setErrors(null);
    (homeServiceMock.postLink as jest.Mock).mockReturnValue(
      throwError(() => new Error('Falha ao salvar'))
    );

    component.salvar();

    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith('Falha ao salvar', 'Fechar');
  });
});