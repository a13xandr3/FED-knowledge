import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  WritableSignal,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, skip } from 'rxjs';

import { createFilterOptions } from 'src/app/shared/utils/filter-options.util';
import { FiltroSelecionado, FiltroTipo } from 'src/app/shared/interfaces/filtro-selecionado.interface';
import { SelectOption } from 'src/app/shared/models/select-option.model';
import { HomeService } from 'src/app/shared/services/home.service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { getErrorMessage } from 'src/app/shared/utils/error-message.util';

const ALL_FILTER_VALUE = 'todos';

@Component({
  selector: 'app-filtro',
  templateUrl: './app-filtro.component.html',
  styleUrl: './app-filtro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule]
})
export class AppFiltroComponent implements OnInit {
  readonly selectedFilter = input<FiltroSelecionado | null>(null);
  readonly filtroSelecionado = output<FiltroSelecionado>();

  readonly categoriaOptions = signal<readonly SelectOption<string>[]>([]);
  readonly tagOptions = signal<readonly SelectOption<string>[]>([]);

  readonly categoryCtrl = new FormControl<SelectOption<string> | null>(null);
  readonly tagCtrl = new FormControl<SelectOption<string> | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly homeService = inject(HomeService);
  private readonly linkStateService = inject(LinkStateService);
  private readonly snackService = inject(SnackService);

  private readonly selectedFilterEffect = effect(() => {
    const selectedFilter = this.selectedFilter();

    if (!selectedFilter) {
      return;
    }

    const options = selectedFilter.tipo === 'categoria'
      ? this.categoriaOptions()
      : this.tagOptions();

    this.applySelectedFilter(selectedFilter, options);
  });

  readonly compareOptions = (
    first: SelectOption<string> | null,
    second: SelectOption<string> | null
  ): boolean => first?.value === second?.value;

  ngOnInit(): void {
    this.bindFilterControl(this.categoryCtrl, 'categoria');
    this.bindFilterControl(this.tagCtrl, 'tag');
    this.loadFilters();

    this.linkStateService.refreshLink$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFilters());
  }

  private emitFilter(tipo: FiltroTipo, value?: string): void {
    if (!value) {
      return;
    }

    this.filtroSelecionado.emit({ tipo, valor: value });
  }

  private bindFilterControl(control: FormControl<SelectOption<string> | null>, tipo: FiltroTipo): void {
    control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((option) => {
        this.updateRelatedControlState(tipo, option?.value);
        this.emitFilter(tipo, option?.value);
      });
  }

  private updateRelatedControlState(tipo: FiltroTipo, value?: string): void {
    const relatedControl = tipo === 'categoria' ? this.tagCtrl : this.categoryCtrl;
    const relatedTipo: FiltroTipo = tipo === 'categoria' ? 'tag' : 'categoria';

    if (!value || value === ALL_FILTER_VALUE) {
      relatedControl.enable({ emitEvent: false });
      return;
    }

    relatedControl.setValue(
      this.findOption(relatedTipo, ALL_FILTER_VALUE),
      { emitEvent: false }
    );
    relatedControl.disable({ emitEvent: false });
  }

  private applySelectedFilter(
    selectedFilter: FiltroSelecionado,
    options: readonly SelectOption<string>[]
  ): void {
    const control = selectedFilter.tipo === 'categoria' ? this.categoryCtrl : this.tagCtrl;
    const option = options.find((item) => item.value === selectedFilter.valor)
      ?? { value: selectedFilter.valor, label: selectedFilter.valor };

    control.setValue(option, { emitEvent: false });
    this.updateRelatedControlState(selectedFilter.tipo, selectedFilter.valor);
  }

  private findOption(tipo: FiltroTipo, value: string): SelectOption<string> {
    const options = tipo === 'categoria' ? this.categoriaOptions() : this.tagOptions();

    return options.find((option) => option.value === value) ?? { value, label: value };
  }

  private loadFilters(): void {
    this.loadOptions(this.homeService.getCategorias(), this.categoriaOptions);
    this.loadOptions(this.homeService.getTags(), this.tagOptions);
  }

  private loadOptions(
    source$: Observable<unknown>,
    target: WritableSignal<readonly SelectOption<string>[]>
  ): void {
    source$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => target.set(createFilterOptions(response)),
        error: (error: unknown) => this.showError(error)
      });
  }

  private showError(error: unknown): void {
    this.snackService.mostrarMensagem(
      getErrorMessage(error, 'Não foi possível carregar os filtros.'),
      'Fechar'
    );
  }
}
