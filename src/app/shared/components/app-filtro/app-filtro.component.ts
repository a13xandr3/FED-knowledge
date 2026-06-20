import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  WritableSignal,
  inject,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, skip } from 'rxjs';

import { SelectOption } from 'src/app/shared/models/select-option.model';
import { HomeService } from 'src/app/shared/services/home.service';
import { SnackService } from 'src/app/shared/services/snack.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';

export type FiltroTipo = 'categoria' | 'tag';

export interface FiltroSelecionado {
  tipo: FiltroTipo;
  valor: string;
}

@Component({
  selector: 'app-filtro',
  templateUrl: './app-filtro.component.html',
  styleUrl: './app-filtro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule]
})
export class AppFiltroComponent implements OnInit {
  readonly filtroSelecionado = output<FiltroSelecionado>();

  readonly statusOptionsCat = signal<readonly SelectOption<string>[]>([]);
  readonly statusOptionsTag = signal<readonly SelectOption<string>[]>([]);

  readonly categoryCtrl = new FormControl<SelectOption<string> | null>(null);
  readonly tagCtrl = new FormControl<SelectOption<string> | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly homeService = inject(HomeService);
  private readonly linkStateService = inject(LinkStateService);
  private readonly snackService = inject(SnackService);

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
      .subscribe((option) => this.emitFilter(tipo, option?.value));
  }

  private loadFilters(): void {
    this.loadOptions(this.homeService.getCategorias(), this.statusOptionsCat);
    this.loadOptions(this.homeService.getTags(), this.statusOptionsTag);
  }

  private loadOptions(
    source$: Observable<unknown>,
    target: WritableSignal<readonly SelectOption<string>[]>
  ): void {
    source$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => target.set(this.toOptions(response)),
        error: (error: unknown) => this.showError(error)
      });
  }

  private toOptions(response: unknown): readonly SelectOption<string>[] {
    return ['todos', ...this.toStringArray(response)].map((value) => {
      return { value, label: value };
    });
  }

  private toStringArray(response: unknown): string[] {
    return Array.isArray(response)
      ? response.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private showError(error: unknown): void {
    const message = error instanceof HttpErrorResponse || error instanceof Error
      ? error.message
      : 'Não foi possível carregar os filtros.';

    this.snackService.mostrarMensagem(message, 'Fechar');
  }
}
