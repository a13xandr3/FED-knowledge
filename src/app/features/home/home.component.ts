import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageEvent, MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { IactionStatus } from 'src/app/shared/request/request';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { HomeService } from 'src/app/shared/services/home.service';
import { ILinksResponse } from 'src/app/shared/response/response';
import { SnackService } from 'src/app/shared/services/snack.service';

import arquivo from 'src/assets/data/arquivo.json';

import { DialogContentComponent } from 'src/app/shared/components/dialog-content/dialog-content.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { HeaderComponent } from 'src/app/shared/components/header/header.component';
import { MatChipsModule } from '@angular/material/chips';
import { createHomeDialogData } from './home-dialog-data.factory';
import { FileRefsValue, TagValue, getTagValues, hasTagValues, parseSelectedFilter, toFileIds } from 'src/app/shared/utils/home-filter.util';

type LinksResponse = {
  atividades?: ILinksResponse[];
  links?: ILinksResponse[];
  total: number;
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    RouterModule,
    MatChipsModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    HeaderComponent
  ]
})
export class HomeComponent implements OnInit {
  totalHoras?: number;
  readonly categoriaExcessao = arquivo.categoriaExcessao;
  titulo = '';
  itemModificadoCategoria = '';
  itemModificadoTag = '';

  links: ILinksResponse[] = [];

  readonly displayedColumns: string[] = ['id', 'categoria', 'name', 'tag', 'actions'];
  totalLinks = 0;
  pageSize = 10;
  pageIndex = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly linkStateService = inject(LinkStateService);
  private readonly homeService = inject(HomeService);
  private readonly snackService = inject(SnackService);

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => { this.titulo = params['titulo']; });
    this.resetPaginador();
    this.subscreverAtualizacoes();
  }

  injectUrl(url: { url?: string; uri?: { uris?: string[] } } | null | undefined): string {
    return url?.url || url?.uri?.uris?.[0] || '';
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.getLinks();
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.totalLinks / this.pageSize), 1);
  }

  get visiblePages(): number[] {
    const maxVisiblePages = 5;
    const lastStart = Math.max(this.totalPages - maxVisiblePages, 0);
    const start = Math.min(Math.max(this.pageIndex - 2, 0), lastStart);
    const length = Math.min(maxVisiblePages, this.totalPages);

    return Array.from({ length }, (_, index) => start + index);
  }

  get isFirstPage(): boolean {
    return this.pageIndex <= 0;
  }

  get isLastPage(): boolean {
    return this.pageIndex >= this.totalPages - 1;
  }

  goToPage(pageIndex: number): void {
    if (pageIndex === this.pageIndex || pageIndex < 0 || pageIndex >= this.totalPages) return;
    this.pageIndex = pageIndex;
    this.getLinks();
  }

  goToFirstPage(): void {
    this.goToPage(0);
  }

  goToPreviousPage(): void {
    this.goToPage(this.pageIndex - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.pageIndex + 1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages - 1);
  }

  private subscreverAtualizacoes(): void {
    this.linkStateService.refreshLink$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(refresh => {
        if (refresh) {
          this.getLinks();
        }
      });
  }

  private atualizarLista(): void {
    this.getLinks();
    this.linkStateService.triggerRefresh();
  }

  onChangeTag(value: string): void {
    this.resetPaginador();
    this.onItemSelecionado(value);
  }

  onItemSelecionado(itemSelecionado: string): void {
    const { tipo, valor } = parseSelectedFilter(itemSelecionado);
    const filtroValor = valor === 'todos' ? '' : valor;
    this.itemModificadoCategoria = tipo === 'categoria' ? filtroValor : '';
    this.itemModificadoTag = tipo === 'tag' ? filtroValor : '';
    this.resetPaginador();
    this.getLinks();
  }
  getLinks(): void {
    this.homeService.getLinks(
                          this.pageIndex, 
                          this.pageSize, 
                          this.categoriaExcessao, 
                          this.itemModificadoCategoria, 
                          this.itemModificadoTag
                        )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (response: LinksResponse) => {
        const links = [...(response.atividades ?? response.links ?? [])]
          .sort((a, b) => a.name.localeCompare(b.name));

        this.totalHoras = links[0]?.categoria?.toLowerCase() === 'timesheet'
          ? this.homeService.totalHorasTimeSheet(links)
          : undefined;
        this.links = links;
        this.totalLinks = response.total;
      },
      error: (err: HttpErrorResponse) => {
        this.snackService.mostrarMensagem(
          err.message, 'Fechar'
        );
      }
    });
  }

  abrirDialog(obj: IactionStatus, showSite?: boolean): void {
    const totalHorasDia = this.homeService.totalHorasTimeSheet([{
      dataEntradaManha: obj.dataEntradaManha,
      dataSaidaManha: obj.dataSaidaManha,
      dataEntradaTarde: obj.dataEntradaTarde,
      dataSaidaTarde: obj.dataSaidaTarde,
      dataEntradaNoite: obj.dataEntradaNoite,
      dataSaidaNoite: obj.dataSaidaNoite,
    }]);

    const dialogRef = this.dialog.open(DialogContentComponent, {
      autoFocus: true,
      width: 'calc(100vw - 2rem)',
      height: 'calc(100vh - 2rem)',
      maxWidth: 'calc(100vw - 2rem)',
      maxHeight: 'calc(100vh - 2rem)',
      panelClass: 'knowledge-dialog-panel',
      data: createHomeDialogData(obj, totalHorasDia, showSite)
    });
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.atualizarLista();
          dialogRef.close();
      }
    });
  }

  deleteItem(
    linkId: number,
    fileRefs: FileRefsValue
  ): void {
    const payload = { linkId, fileIds: toFileIds(fileRefs) };
    this.homeService.deleteItem(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackService.mostrarMensagem('Card e arquivo(s) excluídos com sucesso!', 'Fechar');
          this.atualizarLista();
        },
        error: (err: HttpErrorResponse) => {
          this.snackService.mostrarMensagem(err?.message ?? 'Falha ao excluir', 'Fechar');
        }
      });
  }

  getTags(tag: TagValue): string[] {
    return getTagValues(tag);
  }

  hasTags(data: TagValue): boolean {
    return hasTagValues(data);
  }

  resetPaginador(): void {
    this.pageIndex = 0;
    this.pageSize = 10;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }
}
