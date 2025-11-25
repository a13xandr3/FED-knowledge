import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ErrorStateMatcher, MatOptionModule } from '@angular/material/core';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SelectOption } from 'src/app/shared/models/select-option.model';
import { MatFormFieldAppearance } from 'src/app/types/appearance';

@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
})
export class SelectFieldComponent implements OnChanges {
  @Input() options: ReadonlyArray<SelectOption<any>> = [];
  @Input() placeholder = 'Select an option';
  @Input() value: any = null;
  @Input() matcher: ErrorStateMatcher = new ErrorStateMatcher();
  
  @Output() valueChange = new EventEmitter<SelectOption<any> | null>();
  
  appearance: MatFormFieldAppearance = 'outline';
  selected = new FormControl<any | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.selected.setValue(this.value ?? null, { emitEvent: false });
    }
  } 
  onSelectionChange(ev: MatSelectChange): void {
    const val = ev.value;
    const found = this.options.find(o => o.value === val) ?? null;
    this.valueChange.emit(found);
  }
  clear(): void {
    this.selected.setValue(null);
    this.valueChange.emit(null);
  }
}
