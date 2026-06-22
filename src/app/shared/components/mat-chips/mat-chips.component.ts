import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import { 
  Component, 
  input,
  Input, 
  output,
  OnChanges, 
  SimpleChanges, 
  forwardRef, 
  ElementRef, 
  ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { map, Observable, startWith } from 'rxjs';
import { normalizeChipValue } from './mat-chips-value.util';

@Component({
    selector: 'app-mat-chips',
    templateUrl: './mat-chips.component.html',
    styleUrl: './mat-chips.component.scss',
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
export class MatChipsComponent implements ControlValueAccessor, OnChanges {
  readonly label = input('');

  @Input() 
  set allChips(v: string[] | undefined) {
    this._allChips = v ? v.slice() : [];
  }

  readonly allChipsChange = output<string[]>();
  
  @ViewChild('chipInput') chipInput!: ElementRef<HTMLInputElement>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly chipCtrl = new FormControl<string | null>('');
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

  // Se o Input mudar pela primeira vez (binding inicial), não reemita nesse ciclo
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allChips']?.firstChange) {
      return; // evita alteração durante o primeiro check
    }
  }
  
  //controlvalueAcessor impl
  private onChange: (value: string[]) => void = () => {};
  private onTouched = () => {};

  // NORMALIZA e atualiza tanto o estado interno quanto o pai (allChips) e o form control
  writeValue(value: unknown): void {
    this.chips = normalizeChipValue(value);
    // atualiza o parent ([(allChips)]) com o valor inicial, se necessário
    //this.allChipsChange.emit(this.chips);
    // notifica o form (garante sincronização)
    //this.onChange(this.chips);
  }

  registerOnChange(fn: (value: string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

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
  private _update(): void {
    this.onChange(this.chips);
    this.onTouched();
    this.allChipsChange.emit(this.chips);
  }

}
