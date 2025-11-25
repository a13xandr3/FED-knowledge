import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  AfterViewInit, 
  OnChanges, 
  SimpleChanges, 
  forwardRef, 
  OnInit, 
  ElementRef, 
  ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { map, Observable, startWith } from 'rxjs';

@Component({
  selector: 'app-mat-chips',
  templateUrl: './mat-chips.component.html',
  styleUrls: ['./mat-chips.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MatChipsComponent),
      multi: true
    }
  ]
})
export class MatChipsComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() public label!: string;
  @Input() 
  set allChips(v: string[] | undefined) {
    this._allChips = v ? v.slice() : [];
  }
  @Output() allChipsChange = new EventEmitter<string[]>();
  
  @ViewChild('chipInput') chipInput!: ElementRef<HTMLInputElement>;

  separatorKeysCodes: number[] = [ENTER, COMMA];
  chipCtrl = new FormControl('');
  filteredChips!: Observable<string[]>;
  chips: string[] = [];
  
  private _allChips: string[] = [];

  get allChips(): string[] { return this._allChips; }
  
  constructor() {
    this.filteredChips = this.chipCtrl.valueChanges.pipe(
      startWith(null),
      map((value: string | null) => (value ? this._filter(value) : this.allChips.slice())),
    );
  }

  ngOnInit(): void {}
  
  ngAfterViewInit(): void {
    // Se precisar notificar o estado inicial, faça APÓS o 1º ciclo
    queueMicrotask(() => {
      // só emite se realmente precisar sincronizar o estado inicial com o pai
      // this.allChipsChange.emit([...this.allChips]);
    });
  }

  // Se o Input mudar pela primeira vez (binding inicial), não reemita nesse ciclo
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allChips']?.firstChange) {
      return; // evita alteração durante o primeiro check
    }
  }
  
  //controlvalueAcessor impl
  private onChange = (value: any) => {};
  private onTouched = () => {};

  // NORMALIZA e atualiza tanto o estado interno quanto o pai (allChips) e o form control
  writeValue(value: any): void {
    const normalized = this.normalizeIncoming(value);
    this.chips = normalized;
    // atualiza o parent ([(allChips)]) com o valor inicial, se necessário
    //this.allChipsChange.emit(this.chips);
    // notifica o form (garante sincronização)
    //this.onChange(this.chips);
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) this.chipCtrl.disable({ emitEvent: false });
    else this.chipCtrl.enable({ emitEvent: false });
  }

  /*
  addChip(tag: string) {
    const value = (tag || '').trim();
    if (!value || this.chips.includes(value)) return;

    this.chips = [...this.chips, value];
    this._update(); // notifica form e [(allChips)] corretamente

    // opcional: incluir nas sugestões, se fizer sentido
    if (!this.allChips.includes(value)) {
      this.allChips = [...this.allChips, value];
      this.allChipsChange.emit(this.allChips);
    }
  }
  */

  addChip(ev: string | MatChipInputEvent): void {
    // 1) extrai o valor digitado
    const raw = typeof ev === 'string' ? ev : ev?.value;
    const value = (raw ?? '').toString().trim();

    // 2) se vazio/duplicado, apenas limpa input e sai
    if (!value || this.chips.includes(value)) {
      // limpar o input visual (quando veio evento)
      if (typeof ev !== 'string') {
        // alguns temas têm .chipInput.clear(), use safe-call
        (ev as MatChipInputEvent).chipInput?.clear?.();
      }
      // zera o FormControl sem emitir loop
      this.chipCtrl.setValue('', { emitEvent: false });
      return;
    }

    // 3) adiciona a tag e notifica corretamente (view -> model)
    this.chips = [...this.chips, value];
    this._update();

    // 4) (opcional) inclui nas sugestões
    if (!this.allChips.includes(value)) {
      this.allChips = [...this.allChips, value];
      this.allChipsChange.emit(this.allChips);
    }

    // 5) limpa o input
    if (typeof ev !== 'string') {
      (ev as MatChipInputEvent).chipInput?.clear?.();
    }
    this.chipCtrl.setValue('', { emitEvent: false });
  }

  removeTag(tag: string): void {
    const index = this.chips.indexOf(tag);
    if ( index >= 0 ) {
      this.chips.splice(index, 1);
      this._update();
    }
  }
  chipSelected(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.viewValue;
    if ( !this.chips.includes(value) ) {
      this.chips.push(value);
      this._update();
    }
    this.chipInput.nativeElement.value = '';
    this.chipCtrl.setValue(null);
  }
  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allChips.filter(chip => chip.toLowerCase().includes(filterValue));
  }
  private _update() {
    this.onChange(this.chips);
    this.onTouched();
    this.allChipsChange.emit(this.chips);
  }

  // --- Normalização robusta
  private normalizeIncoming(value: any): string[] {
    if (!value && value !== 0) return [];
    // caso venha já um array de strings ou mistas
    if (Array.isArray(value)) {
      return value.map(item => this.itemToString(item)).filter(Boolean);
    }
    // se veio um objeto { tags: [...]} ou { uris: [...] }
    if (typeof value === 'object') {
      if (Array.isArray(value.tags)) return value.tags.map((i: any) => this.itemToString(i)).filter(Boolean);
      if (Array.isArray(value.uris)) return value.uris.map((i: any) => this.itemToString(i)).filter(Boolean);
      // objeto simples -> tentar extrair propriedades conhecidas
      if (value.value) return [String(value.value)];
    }
    // string ou número único
    if (typeof value === 'string' || typeof value === 'number') {
      const s = String(value).trim();
      return s ? [s] : [];
    }
    return [];
  }

  private itemToString(item: any): string {
    if (typeof item === 'string') return item;
    if (typeof item === 'number') return String(item);
    if (item == null) return '';
    // objetos comuns: { value: 'x' } || { tag: 'x' } || { uri: 'x' }
    if (typeof item === 'object') {
      if (item.value) return String(item.value);
      if (item.tag) return String(item.tag);
      if (item.uri) return String(item.uri);
      // fallback: JSON string (evite isso se puder)
      try { return JSON.stringify(item); } catch { return ''; }
    }
    return '';
  }
}