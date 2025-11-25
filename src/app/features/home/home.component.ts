import { LoginService } from 'src/app/shared/services/login.service';
import { 
  AfterViewInit, 
  Component, 
  Input, 
  OnDestroy, 
  OnInit, 
  ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageEvent, MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { Subject, takeUntil } from 'rxjs';

import { IactionStatus } from 'src/app/shared/request/request';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { HomeService } from 'src/app/shared/services/home.service';
import { Comportamento, ComportamentoService } from 'src/app/shared/services/comportamento.service';
import { ILinksResponse } from 'src/app/shared/response/response';
import { SnackService } from 'src/app/shared/services/snack.service';

import arquivo from 'src/assets/data/arquivo.json';

import { DialogContentComponent } from 'src/app/shared/components/dialog-content/dialog-content.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from 'src/app/shared/components/header/header.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsComponent } from 'src/app/shared/components/mat-chips/mat-chips.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    MatChipsModule,
    MatFormFieldModule,
    MatTableModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    MatDialogModule,
  ],
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  totalHoras: any;
  categoriaExcessao = arquivo.categoriaExcessao;
  @Input() titulo!: string;
  itemModificadoCategoria: string = '';
  itemModificadoTag: string = '';

  links: ILinksResponse[] = [];
  
  dataSource = new MatTableDataSource(this.links);
  comportamentos: Comportamento[] = [];
  pagedItems: ILinksResponse[] = [];
  displayedColumns: string[] = ['id','categoria', 'name', 'tag', 'actions'];
  totalLinks!: number;
  pageSize!: number;
  pageIndex!: number;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private comportamentoService: ComportamentoService,
    private linkStateService: LinkStateService,
    private homeService: HomeService,
    private snackService: SnackService,
    //private loginService: LoginService
  ) {
  }
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {this.titulo = params['titulo']});
    this.resetPaginador();
    this.subscreverComportamentos();
    this.subscreverAtualizacoes();
  }
  ngAfterViewInit(): void {
  }
  injectUrl(url: any): string {
    return url?.url || url?.uri?.uris?.[0] || '';
  }
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.getLinks();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private subscreverComportamentos(): void {
    this.comportamentoService.comportamentos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lista => {
        this.comportamentos = lista;
      });
  }
  private subscreverAtualizacoes(): void {
    this.linkStateService.refreshLink$
      .pipe(takeUntil(this.destroy$))
      .subscribe(refresh => {
        if (refresh!) {
          this.getLinks();
        }
      });
  }
  private atualizarLista(): void {
    this.getLinks();
    this.linkStateService.triggerRefresh();
  }
  onChangeTag(value: any) {
    //this.pageIndex = event!.pageIndex;
    //this.pageSize = event!.pageSize;
    //let tagValue = `${value}`;
    //this.onItemSelecionado(tagValue);
    this.resetPaginador();
    this.onItemSelecionado(value);
  }
  private parseItemSelecionado(value: string): { tipo: 'categoria' | 'tag', valor: string } {
    const [valor, tipo] = value.split('_');
    return { tipo: tipo as 'categoria' | 'tag', valor };
  }
  onItemSelecionado(itemSelecionado: string): void {
    const { tipo, valor } = this.parseItemSelecionado(itemSelecionado);
    this.itemModificadoCategoria = tipo === 'categoria' ? valor : '';
    this.itemModificadoTag = tipo === 'tag' ? valor : '';
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
                        ).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let lnk = response.atividades;
        lnk.sort((a: any, b: any) => a.name?.localeCompare(b?.name));
        if ( lnk[0].categoria.toLowerCase() === 'timesheet' ) {
          this.totalHoras = this.homeService.totalHorasTimeSheet(lnk);
          this.links = lnk;
          this.totalLinks = response.total;
        } else {
          this.links = lnk;
          this.totalLinks = response.total;
        }
      },
      error: (err: HttpErrorResponse) => {
        this.snackService.mostrarMensagem(
          err.message, 'Fechar'
        );
      }
    });
  }
  abrirDialog(obj: IactionStatus, showSite?: boolean): void {
    const dialogRef = this.dialog.open(DialogContentComponent, {
      autoFocus: true,
      width: '200vw',
      height: '100vh',
      data: {
        id: obj.id,
        name: obj.name,
        uri: [obj.uri],
        status: 'alteracao',
        categoria: obj.categoria,
        descricao: obj.descricao,
        tag: [obj.tag],
        fileID: [obj.fileID],
        subCategoria: obj.subCategoria,
        showSite: showSite,
        dataEntradaManha: obj.dataEntradaManha,
        dataSaidaManha: obj.dataSaidaManha,
        dataEntradaTarde: obj.dataEntradaTarde,
        dataSaidaTarde: obj.dataSaidaTarde,
        dataEntradaNoite: obj.dataEntradaNoite,
        dataSaidaNoite: obj.dataSaidaNoite,
        totalHorasDia: this.homeService.totalHorasTimeSheet([{
          dataEntradaManha: obj.dataEntradaManha,
          dataSaidaManha: obj.dataSaidaManha,
          dataEntradaTarde: obj.dataEntradaTarde,
          dataSaidaTarde: obj.dataSaidaTarde,
          dataEntradaNoite: obj.dataEntradaNoite,
          dataSaidaNoite: obj.dataSaidaNoite,
        }])
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.atualizarLista();
        dialogRef.close();
      }
    });
  }
  delete(id: number): void {
    this.homeService.deleteLink(id).subscribe({
      next: () => {
        this.mostrarMensagem('Card excluido com sucesso!', 'Fechar');
        this.atualizarLista();
      },
      error: (err: HttpErrorResponse) => {
        this.snackService.mostrarMensagem(
          err.message, 'Fechar'
        );
      }
    });
  }
  mostrarMensagem(msg: string, action: any): void {
    this.snackService.mostrarMensagem(msg, action);
  }
  getTags(tag: any): string[] {
    if (!tag) return [];
    if (Array.isArray(tag?.tags)) return tag.tags;
    if (Array.isArray(tag)) {
      return tag.flatMap((item: any) => Array.isArray(item?.tags) ? item.tags : []);
    }
    return [];
  }
  hasTags(data: any): boolean {
    return this.getTags(data).length > 0;
  }
  resetPaginador(): void {
    this.pageIndex = 0;
    this.pageSize = 10;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }
}