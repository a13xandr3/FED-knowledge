
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

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
    styleUrls: ['./app-filtro.component.scss'],
    imports: [
        ReactiveFormsModule
    ]
})
export class AppFiltroComponent implements OnInit, OnDestroy {
  @Output() filtroSelecionado = new EventEmitter<FiltroSelecionado>();

  statusOptionsCat: SelectOption<string>[] = [];
  statusOptionsTag: SelectOption<string>[] = [];

  categoryCtrl = new FormControl<SelectOption<string> | null>(null);
  tagCtrl = new FormControl<SelectOption<string> | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private homeService: HomeService,
    private linkStateService: LinkStateService,
    private snackService: SnackService
  ) {}

  ngOnInit(): void {
    this.getCategories();
    this.getTags();

    this.linkStateService.refreshLink$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.getCategories();
        this.getTags();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onChangeCategory(value?: string): void {
    if (!value) {
      return;
    }

    this.filtroSelecionado.emit({ tipo: 'categoria', valor: value });
  }

  onChangeTag(value?: string): void {
    if (!value) {
      return;
    }

    this.filtroSelecionado.emit({ tipo: 'tag', valor: value });
  }

  getTags(): void {
    this.homeService.getTags().subscribe({
      next: (response: unknown) => {
        const resp = this.toStringArray(response);

        resp.unshift('todos');
        this.statusOptionsTag = resp.map((tag) => ({
          value: tag,
          label: tag
        }));
      },
      error: (err: HttpErrorResponse) => {
        this.snackService.mostrarMensagem(err.message, 'Fechar');
      }
    });
  }

  getCategories(): void {
    this.homeService.getCategorias().subscribe({
      next: (response: unknown) => {
        const resp = this.toStringArray(response);

        resp.unshift('todos');
        this.statusOptionsCat = resp.map((cat) => ({
          value: cat,
          label: cat
        }));
      },
      error: (err: HttpErrorResponse) => {
        this.snackService.mostrarMensagem(err.message, 'Fechar');
      }
    });
  }

  private toStringArray(response: unknown): string[] {
    return Array.isArray(response)
      ? response.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
