import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ShowFileComponent } from './show-file.component';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { ShowFileData } from '../../interfaces/interface.file-ref';

jest.mock('xlsx', () => ({
  read: jest.fn(() => ({
    SheetNames: ['Plan1'],
    Sheets: { Plan1: {} },
  })),
  utils: {
    sheet_to_html: jest.fn(() => '<table><tr><td>A1</td></tr></table>'),
  },
}));

jest.mock('docx-preview', () => ({
  __esModule: true,
  default: {
    renderAsync: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('mammoth/mammoth.browser', () => ({
  convertToHtml: jest.fn().mockResolvedValue({ value: '<p>docx fallback</p>' }),
}));

describe('ShowFileComponent', () => {
  let component: ShowFileComponent;
  let fixture: ComponentFixture<ShowFileComponent>;
  let dialogData: ShowFileData | null;
  let dialogRef: { close: jest.Mock };
  let fileApiService: { download: jest.Mock };

  const xlsxMock = jest.requireMock('xlsx') as {
    read: jest.Mock;
    utils: { sheet_to_html: jest.Mock };
  };
  const docxPreviewMock = jest.requireMock('docx-preview').default as {
    renderAsync: jest.Mock;
  };
  const mammothMock = jest.requireMock('mammoth/mammoth.browser') as {
    convertToHtml: jest.Mock;
  };

  beforeAll(() => {
    if (!File.prototype.arrayBuffer) {
      Object.defineProperty(File.prototype, 'arrayBuffer', {
        configurable: true,
        value(this: File): Promise<ArrayBuffer> {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error);
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.readAsArrayBuffer(this);
          });
        },
      });
    }
  });

  beforeEach(async () => {
    dialogData = null;
    dialogRef = { close: jest.fn() };
    fileApiService = { download: jest.fn() };
    xlsxMock.read.mockClear();
    xlsxMock.utils.sheet_to_html.mockClear();
    docxPreviewMock.renderAsync.mockReset().mockResolvedValue(undefined);
    mammothMock.convertToHtml.mockClear();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });

    await TestBed.configureTestingModule({
      imports: [ShowFileComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useFactory: () => dialogData },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: FileApiService, useFactory: () => fileApiService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve inicializar sem snapshot como preview indisponivel', async () => {
    createComponent();

    await component.ngOnInit();

    expect(component.renderKind).toBe('other');
    expect(component.loading).toBe(false);
    expect(component.originalFile).toBeNull();
  });

  it('deve renderizar imagem restaurada por base64', async () => {
    dialogData = { snapshot: createSnapshot('foto.png', 'image/png', 'imagem'), itemId: 10 };
    createComponent();

    await component.ngOnInit();

    expect(component.itemId).toBe(10);
    expect(component.renderKind).toBe('image');
    expect(component.objectUrl).toBe('blob:preview');
    expect(URL.createObjectURL).toHaveBeenCalledWith(component.originalFile);
    expect(component.prettySize).toBe('6 B');
  });

  it('deve renderizar texto restaurado e limitar o preview', async () => {
    dialogData = { snapshot: createSnapshot('texto.txt', 'text/plain', 'abc') };
    createComponent();

    await component.ngOnInit();

    expect(component.renderKind).toBe('text');
    expect(component.previewText).toBe('abc');
  });

  it('deve renderizar PDF com URL segura', async () => {
    dialogData = { snapshot: createSnapshot('doc.pdf', 'application/pdf', '%PDF') };
    createComponent();
    const sanitizer = TestBed.inject(DomSanitizer);
    const safeUrl = sanitizer.bypassSecurityTrustResourceUrl('blob:preview');

    jest.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl').mockReturnValue(safeUrl);

    await component.ngOnInit();

    expect(component.renderKind).toBe('pdf');
    expect(component.safeObjectUrl).toBe(safeUrl);
  });

  it('deve renderizar XLSX via SheetJS', async () => {
    dialogData = {
      snapshot: createSnapshot(
        'planilha.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xlsx',
      ),
    };
    createComponent();

    await component.ngOnInit();

    expect(component.renderKind).toBe('xlsx');
    expect(xlsxMock.read).toHaveBeenCalled();
    expect(xlsxMock.utils.sheet_to_html).toHaveBeenCalled();
    expect(component.xlsxHtml).toBeTruthy();
  });

  it('deve renderizar DOCX no host via docx-preview', async () => {
    dialogData = {
      snapshot: createSnapshot(
        'doc.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'docx',
      ),
    };
    createComponentWithDocxHost();

    await component.ngOnInit();

    expect(component.renderKind).toBe('docx');
    expect(docxPreviewMock.renderAsync).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      component.docxHost?.nativeElement,
      expect.objectContaining({ className: 'docx' }),
    );
    expect(component.loading).toBe(false);
  });

  it('deve usar Mammoth quando docx-preview falhar', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    docxPreviewMock.renderAsync.mockRejectedValueOnce(new Error('docx-preview'));
    dialogData = {
      snapshot: createSnapshot(
        'doc.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'docx',
      ),
    };
    createComponentWithDocxHost();

    await component.ngOnInit();

    expect(mammothMock.convertToHtml).toHaveBeenCalledWith(
      { arrayBuffer: expect.any(ArrayBuffer) },
      expect.objectContaining({ styleMap: expect.any(Array) }),
    );
    expect(component.docxHtml).toBeTruthy();
  });

  it('deve baixar blob do servidor quando snapshot nao tiver base64', async () => {
    fileApiService.download.mockReturnValue(of(new Blob(['server'], { type: 'text/plain' })));
    dialogData = { snapshot: { filename: 'server.txt', mimeType: 'text/plain' } as any, itemId: 2 };
    createComponent();

    await component.ngOnInit();

    expect(fileApiService.download).toHaveBeenCalledWith(2);
    expect(component.originalFile?.name).toBe('server.txt');
    expect(component.renderKind).toBe('text');
    expect(component.previewText).toBe('server');
  });

  it('deve usar fallback de nome e MIME ao baixar blob sem metadados', async () => {
    fileApiService.download.mockReturnValue(of(new Blob(['bin'])));
    dialogData = { snapshot: {} as any, itemId: 3 };
    createComponent();

    await component.ngOnInit();

    expect(component.originalFile?.name).toBe('file-3');
    expect(component.originalFile?.type).toBe('application/octet-stream');
    expect(component.renderKind).toBe('other');
  });

  it('deve marcar other quando nao houver base64 nem itemId', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    dialogData = { snapshot: { filename: 'sem-base64.txt' } as any };
    createComponent();
    await component.ngOnInit();
    expect(component.renderKind).toBe('other');
  });

  it('deve registrar warn quando download do snapshot falhar', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    fileApiService.download.mockReturnValue(throwError(() => new Error('download')));
    dialogData = { snapshot: { filename: 'server.txt' } as any, itemId: 4 };
    createComponent();

    await component.ngOnInit();

    expect(component.renderKind).toBe('other');
    expect(console.warn).toHaveBeenCalledWith(
      '[ShowFile] falha ao baixar blob do servidor, fallback:',
      expect.any(Error),
    );
  });

  it('download deve disparar arquivo quando existir e ignorar quando ausente', () => {
    createComponent();
    const click = jest.fn();
    const anchor = { href: '', download: '', click };
    jest.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement);

    component.download();
    expect(click).not.toHaveBeenCalled();

    component.originalFile = new File(['abc'], 'a.txt');
    component.download();

    expect(anchor.href).toBe('blob:preview');
    expect(anchor.download).toBe('a.txt');
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('close e ngOnDestroy devem fechar modal e revogar URL quando houver', () => {
    createComponent();

    component.close();
    component.ngOnDestroy();
    component.objectUrl = 'blob:preview';
    component.ngOnDestroy();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('ensureDocxHostReady deve falhar quando host nao ficar disponivel', async () => {
    createComponent();

    await expect((component as any).ensureDocxHostReady()).rejects.toThrow('docxHost não disponível no template.');
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ShowFileComponent);
    component = fixture.componentInstance;
  }

  function createComponentWithDocxHost(): void {
    createComponent();
    component.docxHost = new ElementRef(document.createElement('div'));
  }
});

function createSnapshot(filename: string, mimeType: string, content: string): any {
  return {
    filename,
    mimeType,
    base64Payload: btoa(content),
    contentEncoding: 'identity',
  };
}
