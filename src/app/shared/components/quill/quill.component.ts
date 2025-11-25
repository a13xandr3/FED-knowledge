import {
  Component,
  forwardRef,
  Input,
  OnDestroy
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import Quill from 'quill';
import { QuillConfiguration } from './quill-configuration';
import { QuillModule, type EditorChangeContent } from 'ngx-quill';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quill',
  templateUrl: './quill.component.html',
  styleUrls: ['./quill.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
  @Input() placeholder = '';

  quillConfiguration = QuillConfiguration.modules;

  private quill: Quill | null = null;
  private _value = '';
  private isSettingContents = false;
  private _disabled = false;

  // Angular form callbacks
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {}

  // chamado pelo (onEditorCreated) do ngx-quill
  onEditorCreated(quillInstance: Quill) {
    this.quill = quillInstance;
    if (this._disabled) {
      this.quill.enable(false);
    }
    const applyHtml  = () => {
      if (!this._value) return;
      try {
        const delta = this.quill?.clipboard.convert(this._value) as any;
        this.quill?.setContents(delta, 'silent');
      } catch (err) {
      }
    };
    // Se o modal tiver animação / o editor pode estar invisível, espere um pouco.
    // Ajuste o timeout se necessário ou dispare após evento 'modal opened'
    setTimeout(applyHtml, 200);
  }
  // chamado pelo (onContentChanged) do ngx-quill
  onContentChanged(event: EditorChangeContent | any) {
    if (this.isSettingContents) return;
    if (!event) return;
    // só propaga mudanças feitas pelo usuário (evita loops com setContents('silent'))
    if (event.source === 'user') {
      const html = event.html ?? '';
      const value = (html === '<p><br></p>') ? '' : html;
      this._value = value;
      this.onChange(this._value);
    }
  }
  // marcar como "tocado"
  onBlur() {
    this.onTouched();
  }
  onFocus() {
    // opcional: lógica ao focar
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
  private setEditorHtmlSilent(html: string) {
    if (!this.quill) return;
    this.isSettingContents = true;
    try {
      if (!html) {
        // limpa o editor mantendo o placeholder
        //this.quill.setContents([{ insert: '\n' }], 'silent');
        this.quill.setText('', 'silent');
      } else {
        const delta = this.quill.clipboard.convert(html);
        this.quill.setContents(delta, 'silent');
      }
    } finally {
      // pequeno timeout para garantir que event loop interna do Quill finalize
      setTimeout(() => (this.isSettingContents = false), 0);
    }
  }
  ngOnDestroy(): void {
    // cleanup mínimo; ngx-quill lida com o restante
    this.quill = null;
  }
}