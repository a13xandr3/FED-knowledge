import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  OnDestroy
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import Quill from 'quill';
import { QuillConfiguration } from './quill-configuration';
import { QuillModule } from 'ngx-quill';

type QuillAttributor = {
  whitelist: string[];
};

type IframeFallbackState = {
  iframe: HTMLIFrameElement;
  overlay: HTMLDivElement;
  message: HTMLSpanElement;
  link: HTMLAnchorElement;
  timeoutId: ReturnType<typeof setTimeout> | null;
  loaded: boolean;
  cleanup: Array<() => void>;
};

const FontAttributor = Quill.import('attributors/class/font') as QuillAttributor;
FontAttributor.whitelist = ['Alumni', 'Poppins', 'Raleway'];
Quill.register(FontAttributor as any, true);

const SizeStyle = Quill.import('attributors/style/size') as QuillAttributor;
SizeStyle.whitelist = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '36px', '72px'];
Quill.register(SizeStyle as any, true);

@Component({
  selector: 'app-quill',
  templateUrl: './quill.component.html',
  styleUrl: './quill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    QuillModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuillComponent),
      multi: true
    }
  ]
})
export class QuillComponent implements ControlValueAccessor, OnDestroy {
  readonly placeholder = input('');

  quillConfiguration = QuillConfiguration.modules;

  private quill: Quill | null = null;
  private _value = '';
  private isSettingContents = false;
  private _disabled = false;
  private iframeFallbackScanId: ReturnType<typeof setTimeout> | null = null;
  private readonly iframeFallbackDelayMs = 2500;
  private readonly iframeFallbacks = new Map<HTMLIFrameElement, IframeFallbackState>();
  private editorScrollCleanup: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Angular form callbacks
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  // chamado pelo (onEditorCreated) do ngx-quill
  onEditorCreated(quillInstance: Quill): void {
    this.quill = quillInstance;
    if (this._disabled) {
      this.quill.enable(false);
    }
    const applyHtml  = () => {
      if (!this._value) return;
      try {
        const delta = this.quill?.clipboard.convert({ html: this._value }) as any;
        this.quill?.setContents(delta, 'silent');
        this.scheduleIframeFallbackScan();
      } catch (err) {
      }
    };
    // Se o modal tiver animação / o editor pode estar invisível, espere um pouco.
    // Ajuste o timeout se necessário ou dispare após evento 'modal opened'
    setTimeout(applyHtml, 200);
  }
  // chamado pelo (onContentChanged) do ngx-quill
  onContentChanged(event: { source?: string; html?: string | null } | null): void {
    if (this.isSettingContents) return;
    if (!event) return;
    // só propaga mudanças feitas pelo usuário (evita loops com setContents('silent'))
    if (event.source === 'user') {
      const html = event.html ?? '';
      const value = (html === '<p><br></p>') ? '' : html;
      this._value = value;
      this.onChange(this._value);
      this.scheduleIframeFallbackScan();
    }
  }
  // marcar como "tocado"
  onBlur(): void {
    this.onTouched();
  }

  // ControlValueAccessor
  writeValue(value: string | null): void {
    this._value = value ?? '';
    if (this.quill) {
      this.setEditorHtmlSilent(this._value);
    }
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled;
    if (this.quill) {
      this.quill.enable(!isDisabled);
    }
  }
  // aplica HTML ao editor sem disparar eventos do Quill
  private setEditorHtmlSilent(html: string): void {
    if (!this.quill) return;
    this.isSettingContents = true;
    try {
      if (!html) {
        // limpa o editor mantendo o placeholder
        //this.quill.setContents([{ insert: '\n' }], 'silent');
        this.quill.setText('', 'silent');
      } else {
        const delta = this.quill.clipboard.convert({ html });
        this.quill.setContents(delta, 'silent');
      }
      this.scheduleIframeFallbackScan();
    } finally {
      // pequeno timeout para garantir que event loop interna do Quill finalize
      setTimeout(() => (this.isSettingContents = false), 0);
    }
  }

  private scheduleIframeFallbackScan(delayMs = 0): void {
    if (this.iframeFallbackScanId) {
      clearTimeout(this.iframeFallbackScanId);
    }
    this.iframeFallbackScanId = setTimeout(() => {
      this.iframeFallbackScanId = null;
      this.refreshIframeFallbacks();
    }, delayMs);
  }

  private refreshIframeFallbacks(): void {
    const editor = this.quill?.root as HTMLElement | undefined;
    const container = editor?.parentElement;
    if (!editor || !container) return;

    container.classList.add('kb-iframe-fallback-host');
    this.ensurePositionObservers(editor);

    const currentIframes = new Set(Array.from(editor.querySelectorAll<HTMLIFrameElement>('iframe')));
    this.iframeFallbacks.forEach((state, iframe) => {
      if (!currentIframes.has(iframe)) {
        this.disposeIframeFallback(state);
        this.iframeFallbacks.delete(iframe);
      }
    });

    currentIframes.forEach(iframe => {
      this.normalizeIframeSource(iframe);
      const state = this.iframeFallbacks.get(iframe);
      if (state) {
        state.link.href = this.getIframeSource(iframe);
      } else {
        this.iframeFallbacks.set(iframe, this.createIframeFallback(iframe, container));
      }
    });

    this.updateIframeFallbackPositions();
  }

  private ensurePositionObservers(editor: HTMLElement): void {
    if (!this.editorScrollCleanup) {
      const onScroll = () => this.updateIframeFallbackPositions();
      editor.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      this.editorScrollCleanup = () => {
        editor.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }

    if (!this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateIframeFallbackPositions());
      this.resizeObserver.observe(editor);
    }
  }

  private createIframeFallback(iframe: HTMLIFrameElement, container: HTMLElement): IframeFallbackState {
    const overlay = document.createElement('div');
    overlay.className = 'kb-iframe-fallback-overlay';

    const message = document.createElement('span');
    message.className = 'kb-iframe-fallback-overlay__message';
    message.textContent = 'Nao foi possivel exibir este site aqui.';

    const link = document.createElement('a');
    link.className = 'kb-iframe-fallback-overlay__link';
    link.textContent = 'Abrir em nova aba';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.href = this.getIframeSource(iframe);
    link.setAttribute('aria-label', 'Abrir conteudo do iframe em nova aba');
    link.addEventListener('click', event => event.stopPropagation());

    overlay.append(message, link);
    container.appendChild(overlay);

    const state: IframeFallbackState = {
      iframe,
      overlay,
      message,
      link,
      timeoutId: null,
      loaded: false,
      cleanup: []
    };

    const markLoaded = () => {
      state.loaded = true;
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
        state.timeoutId = null;
      }
      if (this.hasChromeFrameErrorDocument(iframe)) {
        this.markIframeFallbackBlocked(state);
      } else {
        state.overlay.classList.remove('kb-iframe-fallback-overlay--blocked');
      }
      this.updateIframeFallbackPositions();
    };
    const markBlocked = () => this.markIframeFallbackBlocked(state);

    iframe.addEventListener('load', markLoaded);
    iframe.addEventListener('error', markBlocked);
    state.cleanup.push(() => iframe.removeEventListener('load', markLoaded));
    state.cleanup.push(() => iframe.removeEventListener('error', markBlocked));
    state.timeoutId = setTimeout(() => {
      if (!state.loaded) {
        this.markIframeFallbackBlocked(state);
      }
    }, this.iframeFallbackDelayMs);

    return state;
  }

  private updateIframeFallbackPositions(): void {
    const editor = this.quill?.root as HTMLElement | undefined;
    if (!editor) return;

    this.iframeFallbacks.forEach(state => {
      const iframe = state.iframe;
      const overlay = state.overlay;
      const top = iframe.offsetTop - editor.scrollTop;
      const left = iframe.offsetLeft - editor.scrollLeft;
      const width = iframe.offsetWidth;
      const height = Math.max(iframe.offsetHeight, state.overlay.classList.contains('kb-iframe-fallback-overlay--blocked') ? 96 : 40);

      overlay.style.top = `${top}px`;
      overlay.style.left = `${left}px`;
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;
      overlay.style.display = width > 0 ? 'flex' : 'none';
    });
  }

  private markIframeFallbackBlocked(state: IframeFallbackState): void {
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }
    state.overlay.classList.add('kb-iframe-fallback-overlay--blocked');
    this.updateIframeFallbackPositions();
  }

  private disposeIframeFallback(state: IframeFallbackState): void {
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }
    state.cleanup.forEach(cleanup => cleanup());
    state.overlay.remove();
  }

  private normalizeIframeSource(iframe: HTMLIFrameElement): void {
    const src = this.getIframeSource(iframe);
    const embeddableSrc = this.toEmbeddableVideoUrl(src);
    if (embeddableSrc && embeddableSrc !== src) {
      iframe.setAttribute('src', embeddableSrc);
      iframe.src = embeddableSrc;
    }
  }

  private getIframeSource(iframe: HTMLIFrameElement): string {
    return iframe.getAttribute('src') || iframe.src || '';
  }

  private toEmbeddableVideoUrl(src: string): string | null {
    if (!src) return null;
    try {
      const url = new URL(src, window.location.origin);
      const host = url.hostname.replace(/^www\./, '');

      if (host === 'youtube.com' && url.pathname === '/watch') {
        const videoId = url.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (host === 'youtu.be') {
        const videoId = url.pathname.split('/').filter(Boolean)[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (host === 'vimeo.com') {
        const videoId = url.pathname.split('/').filter(Boolean)[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}/` : null;
      }
    } catch {
      return null;
    }

    return null;
  }

  private hasChromeFrameErrorDocument(iframe: HTMLIFrameElement): boolean {
    try {
      const href = iframe.contentDocument?.location?.href ?? '';
      return href.startsWith('chrome-error://');
    } catch {
      return false;
    }
  }

  ngOnDestroy(): void {
    if (this.iframeFallbackScanId) {
      clearTimeout(this.iframeFallbackScanId);
    }
    this.iframeFallbacks.forEach(state => this.disposeIframeFallback(state));
    this.iframeFallbacks.clear();
    this.editorScrollCleanup?.();
    this.resizeObserver?.disconnect();
    // cleanup mínimo; ngx-quill lida com o restante
    this.quill = null;
  }
}
