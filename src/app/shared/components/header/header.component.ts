import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  input,
  output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';

import { DialogContentComponent } from 'src/app/shared/components/dialog-content/dialog-content.component';

import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { HoraFormatadaPipe } from 'src/app/shared/pipes/hora-formatada.pipe';

import { TokenTimeLeftPipe } from 'src/app/shared/pipes/token-time-left.pipe';
import { TokenExpiringSoonPipe } from 'src/app/shared/pipes/token-expiring-soon.pipe';
import { AppFiltroComponent } from 'src/app/shared/components/app-filtro/app-filtro.component';
import { createHeaderDialogData } from 'src/app/shared/components/header/header-dialog-data.factory';
import { DialogContentCloseResult, DialogContentData } from 'src/app/shared/interfaces/dialog-content-data.interface';
import { FiltroSelecionado } from 'src/app/shared/interfaces/filtro-selecionado.interface';
import { clearElementFocus } from 'src/app/shared/utils/focus.util';
import { AuthService } from 'src/app/shared/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppFiltroComponent,
    HoraFormatadaPipe,
    TokenTimeLeftPipe,
    TokenExpiringSoonPipe
  ]
})
export class HeaderComponent implements OnInit {
  readonly titulo = input('');
  readonly totalHoras = input<number | null | undefined>(null);
  readonly selectedFilter = input<FiltroSelecionado | null>(null);

  readonly itemSelecionadoEvent = output<string>();

  selectedItemCategory = '';

  private readonly destroyRef = inject(DestroyRef);
  private readonly linkStateService = inject(LinkStateService);
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly selectedFilterEffect = effect(() => {
    const selectedFilter = this.selectedFilter();

    if (!selectedFilter) {
      return;
    }

    this.selectedItemCategory = selectedFilter.tipo === 'categoria' && selectedFilter.valor !== 'todos'
      ? selectedFilter.valor
      : '';
  });

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    this.linkStateService.triggerRefresh();
  }

  onFiltroSelecionado(filtro: FiltroSelecionado): void {
    this.selectedItemCategory = filtro.tipo === 'categoria' && filtro.valor !== 'todos'
      ? filtro.valor
      : '';

    this.itemSelecionadoEvent.emit(`${filtro.valor}_${filtro.tipo}`);
  }

  abrirDialog(ev?: Event): void {
    clearElementFocus(ev, this.document);

    const dialogRef = this.dialog.open<DialogContentComponent, DialogContentData, DialogContentCloseResult>(
      DialogContentComponent,
      {
        autoFocus: true,
        width: 'calc(100vw - 2rem)',
        height: 'calc(100vh - 2rem)',
        maxWidth: 'calc(100vw - 2rem)',
        maxHeight: 'calc(100vh - 2rem)',
        panelClass: 'knowledge-dialog-panel',
        data: createHeaderDialogData(this.selectedItemCategory),
      }
    );

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => this.refreshAfterDialogClose(result));
  }

  private refreshAfterDialogClose(result: DialogContentCloseResult | undefined): void {
    if (result?.categoria) {
      this.linkStateService.triggerRefresh();
    }
  }
  logout(): void {
    this.authService.logout();
    this.redirectToLogin();
  }

  private redirectToLogin(): void {
    void this.router.navigate(['/login'], { replaceUrl: true });
  }
}
