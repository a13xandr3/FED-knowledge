import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { of, throwError } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DialogContentComponent } from './dialog-content.component';
import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { LinkMapperService } from 'src/app/shared/services/link-mapper.service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { AiExplainService } from 'src/app/shared/services/ai-explain.service';
import { FilesPayload } from 'src/app/shared/utils/file-selection.util';
import { PreviewItem } from 'src/app/types/Files';

// ngx-mask (standalone)
import { provideNgxMask } from 'ngx-mask';

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
  download: jest.fn(),
  getSnapshot: jest.fn(),
  payloadToFile: jest.fn(),
};

const aiExplainServiceMock = {
  explain: jest.fn(),
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
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
    (filesApiServiceMock.download as jest.Mock).mockReturnValue(of(new Blob(['abc'], { type: 'text/plain' })));
    (filesApiServiceMock.getSnapshot as jest.Mock).mockReturnValue(of({ filename: 'a.txt', mimeType: 'text/plain' }));
    (filesApiServiceMock.payloadToFile as jest.Mock).mockResolvedValue(new File(['abc'], 'a.txt', { type: 'text/plain' }));
    (aiExplainServiceMock.explain as jest.Mock).mockReturnValue(of({ explanation: 'Explicacao IA', model: 'gpt-test' }));

    await TestBed.configureTestingModule({
      imports: [
        DialogContentComponent, // standalone
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: HomeService, useValue: homeServiceMock },
        { provide: LinkStateService, useValue: linkStateServiceMock },
        { provide: LinkMapperService, useValue: linkMapperServiceMock },
        { provide: SnackService, useValue: snackServiceMock },
        { provide: FileApiService, useValue: filesApiServiceMock },
        { provide: AiExplainService, useValue: aiExplainServiceMock },
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MAT_DIALOG_DATA, useFactory: createDialogDataMock },
        // ngx-mask config para a NgxMaskDirective usada pelo componente
        provideNgxMask({ validation: false }),
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
    errorSpy.mockRestore();
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
    expect(component.dialogTitleId).toBe(dialogDataMock.id);
    expect(component.isTimesheet).toBe(true);

    component.fr.get('categoria')?.setValue('TI');
    expect(component.isTiCategory).toBe(true);
  });

  it('ngOnInit deve ignorar quando nao houver ids validos', () => {
    component.data = { fileID: [] };
    filesApiServiceMock.buildPreviewsFromFileIds.mockClear();

    component.ngOnInit();

    expect(filesApiServiceMock.buildPreviewsFromFileIds).not.toHaveBeenCalled();
  });

  it('ngOnInit deve aceitar formatos alternativos de ids', async () => {
    component.data = {
      fileID: [
        {
          fileRefs: [{ fileId: 30 }, { file_id: 40 }, { fileID: 50 }, 60],
        },
      ],
    };

    component.ngOnInit();
    await Promise.resolve();

    expect(filesApiServiceMock.buildPreviewsFromFileIds).toHaveBeenCalledWith([30, 40, 50, 60]);
  });

  it('fechar deve fechar o dialog', () => {
    component.fechar();

    expect(matDialogRefMock.close).toHaveBeenCalled();
  });

  it('onChipClick deve abrir URL http valida em nova aba', () => {
    const click = jest.fn();
    const anchor = { href: '', target: '', click };
    const createSpy = jest.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement);

    component.onChipClick({ target: { innerText: 'https://site.com' } } as unknown as MouseEvent);

    expect(anchor.href).toBe('https://site.com');
    expect(anchor.target).toBe('_blank');
    expect(click).toHaveBeenCalled();
    createSpy.mockRestore();
  });

  it('onChipClick deve ignorar URL invalida ou removida', () => {
    const createSpy = jest.spyOn(document, 'createElement');

    component.onChipClick({ target: { innerText: 'javascript:alert(1)' } } as unknown as MouseEvent);
    component.onChipClick({ target: { innerText: 'nao-e-url' } } as unknown as MouseEvent);
    component.onChipClick({ target: { innerText: 'https://site.comX' } } as unknown as MouseEvent);

    expect(createSpy).not.toHaveBeenCalled();
    createSpy.mockRestore();
  });

  it('deve inicializar com dados opcionais ausentes sem quebrar defaults', async () => {
    TestBed.resetTestingModule();
    linkMapperServiceMock.toDateBr.mockReturnValueOnce(null);

    await TestBed.configureTestingModule({
      imports: [DialogContentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: HomeService, useValue: homeServiceMock },
        { provide: LinkStateService, useValue: linkStateServiceMock },
        { provide: LinkMapperService, useValue: linkMapperServiceMock },
        { provide: SnackService, useValue: snackServiceMock },
        { provide: FileApiService, useValue: filesApiServiceMock },
        { provide: AiExplainService, useValue: aiExplainServiceMock },
        { provide: MatDialogRef, useValue: matDialogRefMock },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            categoria: 'TI',
            fileID: 'valor-invalido',
            status: 'inclusao',
          },
        },
        provideNgxMask({ validation: false }),
      ],
    }).compileComponents();

    const partialFixture = TestBed.createComponent(DialogContentComponent);
    const partial = partialFixture.componentInstance;
    partialFixture.detectChanges();

    expect(partial.totalHorasDia).toBeUndefined();
    expect(partial.fr.getRawValue().id).toBe('');
    expect(partial.fr.getRawValue().fileID).toEqual([]);
    expect(partial.fr.getRawValue().descricao).toBe('');
    expect(partial.fr.getRawValue().dataEntradaManha).toBe('');
    expect(partial.isTimesheet).toBe(false);

    partial.fr.get('categoria')?.setValue(null);
    expect(partial.isTiCategory).toBe(false);
  });

  it('ngOnInit deve carregar previews e preencher controle fileID', async () => {
    await Promise.resolve(); // aguarda promises do ngOnInit sem esperar o timer do countdown
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

  it('onPreviewRemovedRef deve remover id do form e preservar initialIds para diff de exclusão', () => {
    component.previewsFromIds = [{ id: 10, url: 'http://file-10', filename: 'file-10' } as any];
    component.fr.get('fileID')?.setValue([10]);
    (component as any).initialIds = [10];

    component.onPreviewRemovedRef({ id: 10, index: 0, filename: 'file-10' });

    expect(component.fr.get('fileID')?.value).toEqual([]);
    expect((component as any).initialIds).toEqual([10]);
  });

  it('onPreviewRemoved deve remover id por indice e ignorar id invalido', () => {
    component.previewsFromIds = [{ id: 10, url: 'http://file-10', filename: 'file-10' } as any];
    component.fr.get('fileID')?.setValue([10]);

    component.onPreviewRemoved(0);
    component.onPreviewRemoved(99);
    component.onPreviewRemovedRef({ id: undefined, index: 0, filename: '' });
    component.fr.get('fileID')?.setValue(null);
    component.onPreviewRemovedRef({ id: 10, index: 0, filename: 'file-10' });

    expect(component.fr.get('fileID')?.value).toEqual([]);
  });

  it('onError deve registrar erro no console', () => {
    const err = new Error('falha');

    component.onError(err);

    expect(errorSpy).toHaveBeenCalledWith(err);
  });

  it('explainTopic deve chamar servico de IA com contexto do card', () => {
    component.aiPrompt = 'Explique como tutorial';

    component.explainTopic();

    expect(aiExplainServiceMock.explain).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'topic',
        prompt: 'Explique como tutorial',
        context: expect.objectContaining({
          name: dialogDataMock.name,
          categoria: dialogDataMock.categoria,
          subCategoria: dialogDataMock.subCategoria,
          descricao: dialogDataMock.descricao,
        }),
      }),
      undefined,
    );
    expect(component.aiResult).toBe('Explicacao IA');
    expect(component.aiResultModel).toBe('gpt-test');
    expect(component.aiLoading).toBe(false);
  });

  it('explainAttachment deve restaurar arquivo da fila e chamar servico de IA', async () => {
    const queuedFile = {
      filename: 'a.txt',
      mimeType: 'text/plain',
      sizeBytes: 3,
      payloadBytes: new Uint8Array([1]),
      contentEncoding: 'identity',
      hashSha256Hex: 'hash',
      hashMode: 'binary',
    };
    (component as any).fileQueue = [queuedFile];

    await component.explainAttachment({
      index: 0,
      filename: 'a.txt',
      mimeType: 'text/plain',
      sizeBytes: 3,
    });

    expect(filesApiServiceMock.payloadToFile).toHaveBeenCalledWith(queuedFile);
    expect(aiExplainServiceMock.explain).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'file',
        attachment: expect.objectContaining({
          filename: 'a.txt',
          mimeType: 'text/plain',
        }),
      }),
      expect.any(File),
    );
  });

  it('insertAiResult deve inserir HTML escapado no campo descricao', () => {
    component.fr.get('descricao')?.setValue('<p>Antes</p>');
    component.aiResult = 'Linha <script>\ncontinua\n\nOutro';

    component.insertAiResult();

    expect(component.fr.get('descricao')?.value).toBe(
      '<p>Antes</p><p><br></p><p>Linha &lt;script&gt;<br>continua</p><p>Outro</p>'
    );
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

  it('salvar deve usar defaults quando tags, uris e filename novo estiverem ausentes', () => {
    component.fr.setErrors(null);
    component.fr.get('tag')?.setValue(null);
    component.fr.get('uri')?.setValue(null);
    component.previewsFromIds = [];
    (component as any).fileQueue = [{}];
    (filesApiServiceMock.uploadOne as jest.Mock).mockReturnValue(of({ id: 321 }));

    component.salvar();

    expect(linkMapperServiceMock.buildRequest).toHaveBeenCalledWith(
      expect.any(Object),
      [],
      [],
      { files: [{ id: 321, filename: 'file-321' }] },
    );
  });

  it('salvar (alteração) deve atualizar, excluir anexos removidos e atualizar snapshot', () => {
    component.fr.setErrors(null);
    component.data.status = 'alteracao';
    component.previewsFromIds = [{ id: 10, url: 'http://file-10', filename: 'file-10' } as any];
    (component as any).initialIds = [10, 20];
    (component as any).fileQueue = [];
    (homeServiceMock.putLink as jest.Mock).mockReturnValue(of(null));
    (filesApiServiceMock.delete as jest.Mock).mockReturnValue(of(null));

    component.salvar();

    expect(homeServiceMock.putLink).toHaveBeenCalledTimes(1);
    expect(homeServiceMock.postLink).not.toHaveBeenCalled();
    expect(filesApiServiceMock.delete).toHaveBeenCalledWith(20);
    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith(
      'Card Atualizado com sucesso!',
      'Fechar'
    );
    expect((component as any).initialIds).toEqual([10]);
  });

  it('salvar deve exibir mensagem de erro quando serviço retornar erro', () => {
    component.fr.setErrors(null);
    (homeServiceMock.postLink as jest.Mock).mockReturnValue(
      throwError(() => new Error('Falha ao salvar'))
    );

    component.salvar();

    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith('Falha ao salvar', 'Fechar');
  });

  it('salvar deve exibir mensagem generica quando erro nao tiver message', () => {
    component.fr.setErrors(null);
    (homeServiceMock.postLink as jest.Mock).mockReturnValue(throwError(() => ({})));

    component.salvar();

    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith('Falha ao salvar', 'Fechar');
  });
});

function createDialogDataMock(): any {
  return {
    ...dialogDataMock,
    fileID: dialogDataMock.fileID.map((item: any) => ({
      ...item,
      fileRefs: item.fileRefs.map((ref: any) => ({ ...ref })),
    })),
  };
}
