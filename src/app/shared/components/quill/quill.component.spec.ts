import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuillComponent } from './quill.component';

describe('QuillComponent', () => {
  let component: QuillComponent;
  let fixture: ComponentFixture<QuillComponent>;
  let quill: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ QuillComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuillComponent);
    component = fixture.componentInstance;
    quill = createQuillMock();
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve registrar callbacks e propagar alteracao de usuario', () => {
    const onChange = jest.fn();
    const onTouched = jest.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);

    component.onContentChanged({ source: 'user', html: '<p>texto</p>' });
    component.onBlur();

    expect(onChange).toHaveBeenCalledWith('<p>texto</p>');
    expect(onTouched).toHaveBeenCalled();
  });

  it('callbacks padrao devem ser seguros antes do registro', () => {
    expect(() => component.onContentChanged({ source: 'user', html: '<p>texto</p>' })).not.toThrow();
    expect(() => component.onBlur()).not.toThrow();
  });

  it('deve converter paragrafo vazio para string vazia e ignorar eventos nao aplicaveis', () => {
    const onChange = jest.fn();
    component.registerOnChange(onChange);

    component.onContentChanged(null);
    component.onContentChanged({ source: 'api', html: '<p>api</p>' });
    (component as any).isSettingContents = true;
    component.onContentChanged({ source: 'user', html: '<p>bloqueado</p>' });
    (component as any).isSettingContents = false;
    component.onContentChanged({ source: 'user', html: null });
    component.onContentChanged({ source: 'user', html: '<p><br></p>' });

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('writeValue deve armazenar valor quando editor ainda nao existe', () => {
    component.writeValue('<p>antes</p>');

    expect((component as any)._value).toBe('<p>antes</p>');
    expect(() => (component as any).setEditorHtmlSilent('<p>sem editor</p>')).not.toThrow();
  });

  it('onEditorCreated deve aplicar disabled e HTML pendente apos timeout', () => {
    jest.useFakeTimers();
    component.writeValue('<p>conteudo</p>');
    component.setDisabledState(true);

    component.onEditorCreated(quill);
    jest.advanceTimersByTime(200);

    expect(quill.enable).toHaveBeenCalledWith(false);
    expect(quill.clipboard.convert).toHaveBeenCalledWith({ html: '<p>conteudo</p>' });
    expect(quill.setContents).toHaveBeenCalledWith({ ops: [] }, 'silent');
  });

  it('onEditorCreated deve ignorar HTML pendente vazio', () => {
    jest.useFakeTimers();

    component.onEditorCreated(quill);
    jest.advanceTimersByTime(200);

    expect(quill.clipboard.convert).not.toHaveBeenCalled();
  });

  it('onEditorCreated deve ignorar erro ao aplicar HTML pendente', () => {
    jest.useFakeTimers();
    component.writeValue('<p>conteudo</p>');
    quill.clipboard.convert.mockImplementation(() => {
      throw new Error('falha');
    });

    expect(() => {
      component.onEditorCreated(quill);
      jest.advanceTimersByTime(200);
    }).not.toThrow();
  });

  it('writeValue deve limpar ou aplicar HTML silenciosamente quando editor existe', () => {
    jest.useFakeTimers();
    component.onEditorCreated(quill);

    component.writeValue(null);
    expect(quill.setText).toHaveBeenCalledWith('', 'silent');

    component.writeValue('<p>html</p>');
    expect(quill.clipboard.convert).toHaveBeenCalledWith({ html: '<p>html</p>' });
    expect(quill.setContents).toHaveBeenCalledWith({ ops: [] }, 'silent');

    jest.runOnlyPendingTimers();
    expect((component as any).isSettingContents).toBe(false);
  });

  it('setDisabledState deve atualizar editor existente', () => {
    component.onEditorCreated(quill);

    component.setDisabledState(true);
    component.setDisabledState(false);

    expect(quill.enable).toHaveBeenCalledWith(false);
    expect(quill.enable).toHaveBeenCalledWith(true);
  });

  it('ngOnDestroy deve limpar referencia do editor', () => {
    component.onEditorCreated(quill);

    component.ngOnDestroy();

    expect((component as any).quill).toBeNull();
  });

  it('deve converter url comum do YouTube para url embed no iframe', () => {
    const { root, cleanup } = createEditorDom(
      '<iframe src="https://www.youtube.com/watch?v=D0JKtqjGv94"></iframe>'
    );
    const quillWithRoot = { ...quill, root };

    component.onEditorCreated(quillWithRoot);
    (component as any).refreshIframeFallbacks();

    const iframe = root.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe('https://www.youtube.com/embed/D0JKtqjGv94');

    cleanup();
  });

  it('deve criar fallback externo quando iframe nao carrega', () => {
    jest.useFakeTimers();
    const { container, root, cleanup } = createEditorDom(
      '<iframe src="https://github.com/a13xandr3/knowledge"></iframe>'
    );
    const quillWithRoot = { ...quill, root };

    component.onEditorCreated(quillWithRoot);
    (component as any).refreshIframeFallbacks();

    const overlay = container.querySelector('.kb-iframe-fallback-overlay') as HTMLDivElement;
    expect(overlay).toBeTruthy();
    expect((overlay.querySelector('a') as HTMLAnchorElement).href)
      .toBe('https://github.com/a13xandr3/knowledge');

    jest.advanceTimersByTime(2500);

    expect(overlay.classList.contains('kb-iframe-fallback-overlay--blocked')).toBe(true);

    cleanup();
  });

  it('deve remover fallback de iframe que saiu do editor e atualizar link de iframe existente', () => {
    const { container, root, cleanup } = createEditorDom(
      '<iframe src="https://example.com/old"></iframe>'
    );
    const quillWithRoot = { ...quill, root };

    component.onEditorCreated(quillWithRoot);
    (component as any).refreshIframeFallbacks();

    const iframe = root.querySelector('iframe') as HTMLIFrameElement;
    iframe.setAttribute('src', 'https://example.com/new');
    (component as any).refreshIframeFallbacks();

    expect((container.querySelector('a') as HTMLAnchorElement).href).toBe('https://example.com/new');

    iframe.remove();
    (component as any).refreshIframeFallbacks();

    expect(container.querySelector('.kb-iframe-fallback-overlay')).toBeNull();

    cleanup();
  });

  it('deve observar resize quando ResizeObserver estiver disponivel', () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const observe = jest.fn();
    const disconnect = jest.fn();
    (globalThis as any).ResizeObserver = jest.fn().mockImplementation(() => ({ observe, disconnect }));
    const { root, cleanup } = createEditorDom('<iframe src="https://example.com"></iframe>');

    component.onEditorCreated({ ...quill, root });
    (component as any).refreshIframeFallbacks();

    expect(observe).toHaveBeenCalledWith(root);

    component.ngOnDestroy();
    expect(disconnect).toHaveBeenCalled();

    (globalThis as any).ResizeObserver = originalResizeObserver;
    cleanup();
  });

  it('deve remover estado bloqueado quando iframe carregar apos timeout', () => {
    jest.useFakeTimers();
    const { container, root, cleanup } = createEditorDom(
      '<iframe src="https://example.com"></iframe>'
    );
    const iframe = root.querySelector('iframe') as HTMLIFrameElement;

    component.onEditorCreated({ ...quill, root });
    (component as any).refreshIframeFallbacks();

    const overlay = container.querySelector('.kb-iframe-fallback-overlay') as HTMLDivElement;
    jest.advanceTimersByTime(2500);
    expect(overlay.classList.contains('kb-iframe-fallback-overlay--blocked')).toBe(true);

    iframe.dispatchEvent(new Event('load'));

    expect(overlay.classList.contains('kb-iframe-fallback-overlay--blocked')).toBe(false);

    cleanup();
  });

  it('deve marcar fallback como bloqueado quando chrome-error for detectado no load', () => {
    jest.useFakeTimers();
    const { container, root, cleanup } = createEditorDom(
      '<iframe src="https://example.com"></iframe>'
    );
    const iframe = root.querySelector('iframe') as HTMLIFrameElement;

    component.onEditorCreated({ ...quill, root });
    (component as any).refreshIframeFallbacks();
    jest.spyOn(component as any, 'hasChromeFrameErrorDocument').mockReturnValue(true);

    iframe.dispatchEvent(new Event('load'));

    const overlay = container.querySelector('.kb-iframe-fallback-overlay') as HTMLDivElement;
    expect(overlay.classList.contains('kb-iframe-fallback-overlay--blocked')).toBe(true);

    cleanup();
  });

  it('deve tratar variantes de video e URLs invalidas sem quebrar', () => {
    expect((component as any).toEmbeddableVideoUrl('https://youtu.be/D0JKtqjGv94'))
      .toBe('https://www.youtube.com/embed/D0JKtqjGv94');
    expect((component as any).toEmbeddableVideoUrl('https://vimeo.com/123456'))
      .toBe('https://player.vimeo.com/video/123456/');
    expect((component as any).toEmbeddableVideoUrl('https://example.com/page'))
      .toBeNull();
    expect((component as any).toEmbeddableVideoUrl('http://[::1'))
      .toBeNull();
  });

  it('deve retornar falso quando leitura do documento do iframe falhar', () => {
    const iframe = {
      get contentDocument() {
        throw new Error('acesso bloqueado');
      }
    } as unknown as HTMLIFrameElement;

    expect((component as any).hasChromeFrameErrorDocument(iframe)).toBe(false);
  });

  it('deve cobrir callbacks de timeout em estados carregado e pendente', () => {
    jest.useFakeTimers();
    const { container, root, cleanup } = createEditorDom('');
    const loadedIframe = document.createElement('iframe');
    const pendingIframe = document.createElement('iframe');
    root.append(loadedIframe, pendingIframe);
    component.onEditorCreated({ ...quill, root });

    const loadedState = (component as any).createIframeFallback(loadedIframe, container);
    const pendingState = (component as any).createIframeFallback(pendingIframe, container);
    loadedState.loaded = true;

    jest.advanceTimersByTime(2500);

    expect(loadedState.overlay.classList.contains('kb-iframe-fallback-overlay--blocked')).toBe(false);
    expect(pendingState.overlay.classList.contains('kb-iframe-fallback-overlay--blocked')).toBe(true);

    (component as any).disposeIframeFallback(loadedState);
    (component as any).disposeIframeFallback(pendingState);
    cleanup();
  });

  it('deve posicionar fallback visivel e ignorar quando nao houver editor', () => {
    expect(() => (component as any).updateIframeFallbackPositions()).not.toThrow();

    const { root, cleanup } = createEditorDom('<iframe src="https://example.com"></iframe>');
    const iframe = root.querySelector('iframe') as HTMLIFrameElement;
    const overlay = document.createElement('div');
    Object.defineProperty(iframe, 'offsetTop', { configurable: true, value: 30 });
    Object.defineProperty(iframe, 'offsetLeft', { configurable: true, value: 12 });
    Object.defineProperty(iframe, 'offsetWidth', { configurable: true, value: 320 });
    Object.defineProperty(iframe, 'offsetHeight', { configurable: true, value: 180 });
    root.scrollTop = 10;
    root.scrollLeft = 2;
    (component as any).quill = { root };
    (component as any).iframeFallbacks.set(iframe, {
      iframe,
      overlay,
      message: document.createElement('span'),
      link: document.createElement('a'),
      timeoutId: null,
      loaded: false,
      cleanup: []
    });

    (component as any).updateIframeFallbackPositions();

    expect(overlay.style.top).toBe('20px');
    expect(overlay.style.left).toBe('10px');
    expect(overlay.style.width).toBe('320px');
    expect(overlay.style.height).toBe('180px');
    expect(overlay.style.display).toBe('flex');

    cleanup();
  });

  it('deve resolver origem do iframe por atributo, propriedade ou vazio', () => {
    expect((component as any).getIframeSource({
      getAttribute: () => 'https://attribute.example'
    } as unknown as HTMLIFrameElement)).toBe('https://attribute.example');

    expect((component as any).getIframeSource({
      getAttribute: () => '',
      src: 'https://property.example'
    } as unknown as HTMLIFrameElement)).toBe('https://property.example');

    expect((component as any).getIframeSource({
      getAttribute: () => '',
      src: ''
    } as unknown as HTMLIFrameElement)).toBe('');
  });

  it('deve retornar null para videos sem id e detectar chrome-error real', () => {
    expect((component as any).toEmbeddableVideoUrl('')).toBeNull();
    expect((component as any).toEmbeddableVideoUrl('https://youtube.com/watch')).toBeNull();
    expect((component as any).toEmbeddableVideoUrl('https://youtu.be/')).toBeNull();
    expect((component as any).toEmbeddableVideoUrl('https://vimeo.com/')).toBeNull();

    expect((component as any).hasChromeFrameErrorDocument({
      contentDocument: {
        location: { href: 'chrome-error://chromewebdata/' }
      }
    } as unknown as HTMLIFrameElement)).toBe(true);

    expect((component as any).hasChromeFrameErrorDocument({
      contentDocument: null
    } as unknown as HTMLIFrameElement)).toBe(false);
  });

  it('deve executar callbacks de scroll, resize, clique do link e erro do iframe', () => {
    const resizeCallbackRef: { current?: ResizeObserverCallback } = {};
    const originalResizeObserver = globalThis.ResizeObserver;
    (globalThis as any).ResizeObserver = jest.fn().mockImplementation((callback: ResizeObserverCallback) => {
      resizeCallbackRef.current = callback;
      return { observe: jest.fn(), disconnect: jest.fn() };
    });
    const { container, root, cleanup } = createEditorDom(
      '<iframe src="https://example.com"></iframe>'
    );
    const iframe = root.querySelector('iframe') as HTMLIFrameElement;

    component.onEditorCreated({ ...quill, root });
    (component as any).refreshIframeFallbacks();

    root.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    resizeCallbackRef.current?.([] as unknown as ResizeObserverEntry[], {} as ResizeObserver);

    const overlay = container.querySelector('.kb-iframe-fallback-overlay') as HTMLDivElement;
    const link = overlay.querySelector('a') as HTMLAnchorElement;
    const parentClick = jest.fn();
    overlay.addEventListener('click', parentClick);
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(parentClick).not.toHaveBeenCalled();

    iframe.dispatchEvent(new Event('error'));
    expect(overlay.classList.contains('kb-iframe-fallback-overlay--blocked')).toBe(true);

    (globalThis as any).ResizeObserver = originalResizeObserver;
    cleanup();
  });
});

function createQuillMock() {
  return {
    enable: jest.fn(),
    setText: jest.fn(),
    setContents: jest.fn(),
    clipboard: {
      convert: jest.fn(() => ({ ops: [] })),
    },
  };
}

function createEditorDom(html: string) {
  const container = document.createElement('div');
  container.className = 'ql-container ql-snow';
  const root = document.createElement('div');
  root.className = 'ql-editor';
  root.innerHTML = html;
  container.appendChild(root);
  document.body.appendChild(container);

  return {
    container,
    root,
    cleanup: () => container.remove()
  };
}
