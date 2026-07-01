import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { InputFileComponent } from './input-file.component';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { FilePreviewBusService } from 'src/app/shared/services/file-preview.bus.service';
import { MatDialog } from '@angular/material/dialog';
import { gzip } from 'pako';

describe('InputFileComponent', () => {
  let component: InputFileComponent;
  let fixture: ComponentFixture<InputFileComponent>;
  let previewBus: Subject<any>;
  let fileApiService: {
    getSnapshot: jest.Mock;
    buildPreviewsFromFileIds: jest.Mock;
    payloadToFile: jest.Mock;
    fileToObjectUrl: jest.Mock;
    revokeObjectUrl: jest.Mock;
  };
  let dialog: { open: jest.Mock };
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(async () => {
    previewBus = new Subject();
    fileApiService = {
      getSnapshot: jest.fn().mockReturnValue(of({ id: 1 })),
      buildPreviewsFromFileIds: jest.fn().mockResolvedValue([
        { id: 1, url: 'blob:1', filename: 'a.txt', sizeBytes: 1 },
      ]),
      payloadToFile: jest.fn().mockResolvedValue(new File(['preview'], 'preview.txt', { type: 'text/plain' })),
      fileToObjectUrl: jest.fn().mockReturnValue('blob:preview'),
      revokeObjectUrl: jest.fn(),
    };
    dialog = { open: jest.fn() };
    globalThis.alert = jest.fn();

    await TestBed.configureTestingModule({
      imports: [InputFileComponent],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: FileApiService, useValue: fileApiService },
        { provide: FilePreviewBusService, useValue: { loadPreviews$: previewBus.asObservable() } },
        { provide: MatDialog, useValue: dialog }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(InputFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve reagir a comandos externos de preview', async () => {
    previewBus.next({ ids: [1], cleanBefore: true });
    await Promise.resolve();

    expect(fileApiService.buildPreviewsFromFileIds).toHaveBeenCalledWith([1]);
    expect(component.previews).toEqual([{ id: 1, url: 'blob:1', filename: 'a.txt', sizeBytes: 1 }]);
  });

  it('deve tratar eventos de drag and drop', () => {
    const file = new File(['a'], 'a.txt');
    const processSpy = jest.spyOn(component, 'processFile').mockResolvedValue();
    const event = createDragEvent([file]);

    component.onDragOver(event);
    component.onDragEnter(event);
    expect(component.dragActive).toBe(true);

    component.onDragLeave(event);
    expect(component.dragActive).toBe(false);

    component.onDrop(event);
    expect(component.dragActive).toBe(false);
    expect(processSpy).toHaveBeenCalledWith(file);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('deve ignorar drop sem arquivos', () => {
    const processSpy = jest.spyOn(component, 'processFile').mockResolvedValue();

    component.onDrop(createDragEvent([]));

    expect(processSpy).not.toHaveBeenCalled();
  });

  it('deve processar arquivos selecionados por input e limpar valor', () => {
    const file = new File(['a'], 'a.txt');
    const processSpy = jest.spyOn(component, 'processFile').mockResolvedValue();
    const input = { files: [file], value: 'a.txt' };

    component.onFileInputChange({ target: input } as unknown as Event);

    expect(processSpy).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('deve ignorar input sem arquivos', () => {
    const processSpy = jest.spyOn(component, 'processFile').mockResolvedValue();

    component.onFileInputChange({ target: { files: [], value: '' } } as unknown as Event);

    expect(processSpy).not.toHaveBeenCalled();
  });

  it('deve identificar imagem por mimeType', () => {
    expect(component.isImage({ mimeType: 'image/PNG' } as any)).toBe(true);
    expect(component.isImage({ mimeType: 'text/plain' } as any)).toBe(false);
  });

  it('onPreviewClick deve ignorar id invalido, abrir dialog em sucesso e emitir erro em falha', async () => {
    await component.onPreviewClick({ id: 0 } as any);
    expect(fileApiService.getSnapshot).not.toHaveBeenCalled();

    await component.onPreviewClick({ id: 10 } as any);
    expect(fileApiService.getSnapshot).toHaveBeenCalledWith(10, true);
    expect(dialog.open).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({
      data: { snapshot: { id: 1 }, itemId: 10 },
    }));

    const emitSpy = jest.spyOn(component.error, 'emit');
    fileApiService.getSnapshot.mockReturnValueOnce(throwError(() => new Error('falha')));
    await component.onPreviewClick({ id: 11 } as any);
    expect(emitSpy).toHaveBeenCalledWith(expect.any(Error));
  });

  it('processFile deve emitir payload gzip com base64', async () => {
    jest.spyOn(component as any, 'compressWithProgress').mockResolvedValue(new Uint8Array([1, 2]));
    jest.spyOn(component as any, 'uint8ToBase64').mockResolvedValue('base64');
    jest.spyOn(component as any, 'sha256HexFromBuffer').mockResolvedValue('hash');
    const emitSpy = jest.spyOn(component.processed, 'emit');

    await component.processFile(new File(['abc'], 'a.txt', { type: 'text/plain' }));

    expect(component.progress).toBe(100);
    expect(component.isProcessing).toBe(false);
    expect(component.previews[0]).toEqual({
      id: 0,
      url: 'blob:preview',
      filename: 'a.txt',
      mimeType: 'text/plain',
      sizeBytes: 3,
    });
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'a.txt',
      base64Gzip: 'base64',
      hashSha256Hex: 'hash',
      contentEncoding: 'gzip',
    }));
  });

  it('processFile deve emitir payload identity sem base64 para arquivo ja comprimido', async () => {
    component.includeBase64 = false;
    jest.spyOn(component as any, 'compressWithProgress').mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
    jest.spyOn(component as any, 'sha256HexFromBuffer').mockResolvedValue('hash');
    const base64Spy = jest.spyOn(component as any, 'uint8ToBase64');
    const emitSpy = jest.spyOn(component.processed, 'emit');

    await component.processFile(new File(['abc'], 'foto.jpg', { type: 'image/jpeg' }));

    expect(base64Spy).not.toHaveBeenCalled();
    expect(component.gzipSizeBytes).toBeUndefined();
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'foto.jpg',
      base64Gzip: undefined,
      contentEncoding: 'identity',
    }));
  });

  it('processFile deve emitir erro e alertar quando arquivo exceder maxBytes', async () => {
    component.maxBytes = 1;
    const emitSpy = jest.spyOn(component.error, 'emit');

    await component.processFile(new File(['abc'], 'a.txt'));

    expect(emitSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(globalThis.alert).toHaveBeenCalledWith('Arquivo excede o limite de 0.0 MB.');
    expect(component.isProcessing).toBe(false);
  });

  it('processFile deve usar mensagem generica quando erro nao tiver message', async () => {
    jest.spyOn(component as any, 'compressWithProgress').mockRejectedValue({});

    await component.processFile(new File(['abc'], 'a.txt'));

    expect(globalThis.alert).toHaveBeenCalledWith('Falha ao processar arquivo.');
  });

  it('clear deve revogar previews e resetar estado', () => {
    const emitSpy = jest.spyOn(component.cleared, 'emit');
    component.previews = [{ id: 1, url: 'blob:1', filename: 'a.txt', sizeBytes: 1 }];
    component.fileName = 'a.txt';
    component.progress = 50;

    component.clear();

    expect(fileApiService.revokeObjectUrl).toHaveBeenCalledWith('blob:1');
    expect(component.previews).toEqual([]);
    expect(component.fileName).toBe('');
    expect(component.progress).toBe(0);
    expect(emitSpy).toHaveBeenCalled();
  });

  it('helpers internos devem converter bytes, hash e progresso', async () => {
    (component as any).setProgress(-1);
    expect(component.progress).toBe(0);
    (component as any).setProgress(120);
    expect(component.progress).toBe(100);

    await expect((component as any).uint8ToBase64(new Uint8Array([65]))).resolves.toBe('QQ==');
    await expect((component as any).sha256HexFromBuffer(new TextEncoder().encode('abc'))).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
    expect((component as any).bufferToHex(new Uint8Array([10, 11]).buffer)).toBe('0a0b');
    expect(Array.from(new Uint8Array((component as any).asArrayBuffer(new Uint8Array([1, 2]))))).toEqual([1, 2]);
  });

  it('readFileAsArrayBuffer deve propagar progresso e erro do FileReader', async () => {
    const OriginalFileReader = globalThis.FileReader;
    const progressSpy = jest.fn();

    class SuccessFileReader {
      result: ArrayBuffer = new Uint8Array([1]).buffer;
      error: Error | null = null;
      onerror: (() => void) | null = null;
      onprogress: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onload: (() => void) | null = null;
      readAsArrayBuffer(): void {
        this.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 } as ProgressEvent<FileReader>);
        this.onload?.();
      }
    }

    globalThis.FileReader = SuccessFileReader as unknown as typeof FileReader;
    await expect((component as any).readFileAsArrayBuffer(new File(['a'], 'a.txt'), progressSpy)).resolves.toBeInstanceOf(ArrayBuffer);
    expect(progressSpy).toHaveBeenCalledWith(0.5);

    const nonComputableProgressSpy = jest.fn();
    class NonComputableProgressFileReader extends SuccessFileReader {
      override readAsArrayBuffer(): void {
        this.onprogress?.({ lengthComputable: false, loaded: 1, total: 2 } as ProgressEvent<FileReader>);
        this.onload?.();
      }
    }
    globalThis.FileReader = NonComputableProgressFileReader as unknown as typeof FileReader;
    await expect((component as any).readFileAsArrayBuffer(new File(['a'], 'a.txt'), nonComputableProgressSpy))
      .resolves.toBeInstanceOf(ArrayBuffer);
    expect(nonComputableProgressSpy).not.toHaveBeenCalled();

    class ErrorFileReader extends SuccessFileReader {
      override error = new Error('file-reader');
      override readAsArrayBuffer(): void {
        this.onerror?.();
      }
    }

    globalThis.FileReader = ErrorFileReader as unknown as typeof FileReader;
    await expect((component as any).readFileAsArrayBuffer(new File(['a'], 'a.txt'))).rejects.toThrow('file-reader');

    globalThis.FileReader = OriginalFileReader;
  });

  it('uint8ToBase64 deve tratar resultado sem prefixo base64 e erro de FileReader', async () => {
    const OriginalFileReader = globalThis.FileReader;

    class RawFileReader {
      result: string | ArrayBuffer | null = 'raw-value';
      error: Error | null = null;
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      readAsDataURL(): void {
        this.onload?.();
      }
    }

    globalThis.FileReader = RawFileReader as unknown as typeof FileReader;
    await expect((component as any).uint8ToBase64(new Uint8Array([1]))).resolves.toBe('raw-value');

    class ErrorFileReader extends RawFileReader {
      override error = new Error('data-url');
      override readAsDataURL(): void {
        this.onerror?.();
      }
    }

    globalThis.FileReader = ErrorFileReader as unknown as typeof FileReader;
    await expect((component as any).uint8ToBase64(new Uint8Array([1]))).rejects.toThrow('data-url');

    globalThis.FileReader = OriginalFileReader;
  });

  it('asArrayBuffer deve copiar SharedArrayBuffer quando disponivel', () => {
    if (typeof SharedArrayBuffer === 'undefined') {
      expect(true).toBe(true);
      return;
    }
    const shared = new SharedArrayBuffer(2);
    const view = new Uint8Array(shared);
    view.set([1, 2]);

    expect(Array.from(new Uint8Array((component as any).asArrayBuffer(view)))).toEqual([1, 2]);
  });

  it('compressWithProgress deve comprimir arquivo com pako', async () => {
    const result = await (component as any).compressWithProgress(new File(['abc'], 'a.txt'));

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('deve avaliar tipos ja comprimidos e decisao de manter gzip', () => {
    const api = component as any;

    expect(api.isAlreadyCompressed('image/jpeg', 'a.txt')).toBe(true);
    expect(api.isAlreadyCompressed('', 'a.png')).toBe(true);
    expect(api.isAlreadyCompressed('image/webp', '')).toBe(true);
    expect(api.isAlreadyCompressed('application/pdf', '')).toBe(true);
    expect(api.isAlreadyCompressed('', 'a.zip')).toBe(true);
    expect(api.isAlreadyCompressed('', 'a.gz')).toBe(true);
    expect(api.isAlreadyCompressed('', 'a.rar')).toBe(true);
    expect(api.isAlreadyCompressed('', 'a.7z')).toBe(true);
    expect(api.isAlreadyCompressed('', 'a.docx')).toBe(true);
    expect(api.isAlreadyCompressed('', 'a.xlsx')).toBe(true);
    expect(api.isAlreadyCompressed('', 'a.pptx')).toBe(true);
    expect(api.isAlreadyCompressed('text/plain', 'a.txt')).toBe(false);

    expect(api.shouldKeepGzip(100, 90)).toBe(true);
    expect(api.shouldKeepGzip(100, 99)).toBe(false);
  });

  it('removePreviewAt deve tratar JSON, remover preview atual e ignorar JSON invalido', () => {
    const removedSpy = jest.spyOn(component.removedAt, 'emit');
    component.previews = [
      { id: 1, url: 'blob:1', filename: 'a.txt', sizeBytes: 1 },
      { id: 2, url: 'blob:2', filename: 'b.txt', sizeBytes: 1 },
    ];

    expect(component.removePreviewAt(JSON.stringify({ fileRefs: [{ id: 1, filename: 'a.txt' }] }), 1))
      .toEqual({ fileRefs: [] });
    expect(component.removePreviewAt(component.previews, 2)).toEqual({
      fileRefs: [{ id: 1, filename: 'a.txt' }],
    });
    expect(component.previews).toHaveLength(1);
    expect(removedSpy).toHaveBeenCalledWith(1);
    expect(component.removePreviewAt('json inválido', 1)).toEqual({ fileRefs: [] });
  });

  it('removePreviewAt deve tratar fileRefs ausente, fileId e preview sem indice correspondente', () => {
    component.previews = [
      { fileId: 3, url: 'blob:3', filename: 'c.txt', sizeBytes: 1 } as any,
    ];

    expect(component.removePreviewAt({ semFileRefs: true }, 1)).toEqual({ fileRefs: [] });
    expect(component.removePreviewAt({ fileRefs: [{ fileId: 3, filename: 'c.txt' }, { fileId: 4 }] }, 4))
      .toEqual({ fileRefs: [{ id: 3, filename: 'c.txt' }] });
    expect(component.removePreviewAt(component.previews, 99)).toEqual({
      fileRefs: [{ id: 3, filename: 'c.txt' }],
    });
    expect(component.removePreviewAt(component.previews, 3)).toEqual({ fileRefs: [] });
    expect(fileApiService.revokeObjectUrl).toHaveBeenCalledWith('blob:3');
  });

  it('addPreviewsFromFileIds deve limpar quando solicitado ou adicionar mantendo previews', async () => {
    component.previews = [{ id: 9, url: 'blob:9', filename: 'old.txt', sizeBytes: 1 }];

    await component.addPreviewsFromFileIds([1], true);
    expect(fileApiService.revokeObjectUrl).toHaveBeenCalledWith('blob:9');
    expect(component.previews).toEqual([{ id: 1, url: 'blob:1', filename: 'a.txt', sizeBytes: 1 }]);

    await component.addPreviewsFromFileIds([1], false);
    expect(component.previews).toHaveLength(2);

    await component.addPreviewsFromFileIds([1]);
    expect(component.previews).toHaveLength(3);
  });

  it('transformFileName deve abreviar nomes longos', () => {
    expect(component.transformFileName('arquivo.txt')).toBe('arquivo.txt');
    expect(component.transformFileName('abcdefghijklmnopqrstuvwxyz.txt')).toBe('abcdefghijklmnopqrst....txt');
  });

  it('onRemove deve emitir e remover preview existente ou ignorar indice invalido', () => {
    const removedRefSpy = jest.spyOn(component.removedRef, 'emit');
    const removedAtSpy = jest.spyOn(component.removedAt, 'emit');
    component.previews = [{ id: 1, url: 'blob:1', filename: 'a.txt', sizeBytes: 1 }];

    component.onRemove(component.previews[0], 0);
    component.onRemove({ filename: 'x', url: '', sizeBytes: 0 } as any, 99);

    expect(removedRefSpy).toHaveBeenCalledWith({ id: 1, index: 0, filename: 'a.txt' });
    expect(removedAtSpy).toHaveBeenCalledWith(0);
    expect(component.previews).toEqual([]);
  });

  it('onExplain deve emitir referencia do preview', () => {
    const explainSpy = jest.spyOn(component.explainRef, 'emit');
    component.previews = [{ id: 1, url: 'blob:1', filename: 'a.txt', mimeType: 'text/plain', sizeBytes: 1 }];

    component.onExplain(component.previews[0], 0);
    component.onExplain({ filename: 'x', url: '', sizeBytes: 0 } as any, 99);

    expect(explainSpy).toHaveBeenCalledTimes(1);
    expect(explainSpy).toHaveBeenCalledWith({
      id: 1,
      index: 0,
      filename: 'a.txt',
      mimeType: 'text/plain',
      sizeBytes: 1,
    });
  });

  it('getIconClasses e trackById devem retornar valores esperados', () => {
    expect(component.getIconClasses({ mimeType: 'application/pdf' } as any)).toEqual(['fa-file-pdf', 'text-red-500']);
    expect(component.getIconClasses({ mimeType: 'text/plain' } as any)).toEqual(['fa-file-txt', 'text-red-500']);
    expect(component.getIconClasses({ mimeType: 'application/msword' } as any)).toEqual(['fa-file-word', 'text-blue-600']);
    expect(component.getIconClasses({ mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } as any)).toEqual(['fa-file-word', 'text-blue-600']);
    expect(component.getIconClasses({ mimeType: 'application/vnd.ms-excel' } as any)).toEqual(['fa-file-excel', 'text-green-600']);
    expect(component.getIconClasses({ mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as any)).toEqual(['fa-file-excel', 'text-green-600']);
    expect(component.getIconClasses({ mimeType: 'video/mp4' } as any)).toEqual(['fa-file-video', 'text-purple-600']);
    expect(component.getIconClasses({ mimeType: 'application/mpeg4' } as any)).toEqual(['fa-file-video', 'text-purple-600']);
    expect(component.getIconClasses({ mimeType: '' } as any)).toEqual(['fa-file-alt', 'text-gray-500']);

    expect(component.trackById(0, { id: 1, filename: 'a', url: '', sizeBytes: 1 })).toBe(1);
    expect(component.trackById(1, { filename: 'a', url: '', sizeBytes: 1 })).toBe('a');
    expect(component.trackById(2, { filename: '', url: '', sizeBytes: 1 })).toBe(2);
  });
});

function createDragEvent(files: File[]): DragEvent {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    dataTransfer: { files },
  } as unknown as DragEvent;
}
