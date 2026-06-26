import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  OnInit,
  output
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ErrorStateMatcher, MatOptionModule } from '@angular/material/core';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SelectOption } from 'src/app/shared/models/select-option.model';

@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.component.html',
  styleUrl: './select-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    ReactiveFormsModule
],
})
export class SelectFieldComponent implements OnInit {
  readonly options = input<ReadonlyArray<SelectOption<unknown>>>([]);
  readonly placeholder = input('Select an option');
  readonly value = input<unknown>(null);
  readonly matcher = input(new ErrorStateMatcher());
  readonly valueChange = output<SelectOption<unknown> | null>();
  readonly selected = new FormControl<unknown | null>(null);
  ngOnInit(): void {
    effect(() => {
      this.selected.setValue(this.value() ?? null, { emitEvent: false });
    });
  }
  onSelectionChange(ev: MatSelectChange): void {
    const val = ev.value;
    const found = this.options().find(o => o.value === val) ?? null;
    this.valueChange.emit(found);
  }
  clear(): void {
    this.selected.setValue(null);
    this.valueChange.emit(null);
  }
}