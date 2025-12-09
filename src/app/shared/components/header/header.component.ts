import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { SnackService } from 'src/app/shared/services/snack.service';
import { DialogContentComponent } from 'src/app/shared/components/dialog-content/dialog-content.component';

import { HomeService } from 'src/app/shared/services/home.service';
import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { ICategoria } from 'src/app/shared/request/request';
import { SelectOption } from 'src/app/shared/models/select-option.model';
import { HoraFormatadaPipe } from 'src/app/shared/pipes/hora-formatada.pipe';
import { SelectFieldComponent } from 'src/app/shared/components/select-field/select-field.component';
import { ErrorStateMatcher } from '@angular/material/core';
import { TokenTimeLeftPipe } from 'src/app/shared/pipes/token-time-left.pipe';

// Type guard para verificar se um objeto tem a estrutura esperada de tags
function isTagObject(v: any): v is { tags: unknown } {
  return v && typeof v === 'object' && Array.isArray((v as any).tags);
}
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HoraFormatadaPipe,
    MatSelectModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    SelectFieldComponent,
    TokenTimeLeftPipe,
  ]
})
export class HeaderComponent implements OnInit {
  @Input() matcher: ErrorStateMatcher = new ErrorStateMatcher();
  @Input() titulo!: string;
  @Input() totalHoras!: any;

  @Output() itemSelecionadoEvent = new EventEmitter<string>();

  links: string[] = [];
  tg: string[] = [];
  statusOptionsCat: SelectOption<string>[] = [];
  statusOptionsTag: SelectOption<string>[] = [];

  selectedItemCategory: string = '';
  selectedItemTag: string = '';
  
  // valor inicial opcional
  initialValue: string | null = '';

  constructor(
    private homeService: HomeService,
    private linkStateService: LinkStateService,
    private snackService: SnackService,
    private dialog: MatDialog) {
      this.linkStateService.triggerRefresh();
    }
  ngOnInit(): void {
    this.brDate();
    this.getCategories();
    this.getTags();
    this.linkStateService.refreshLink$.subscribe(() => {
      this.getCategories();
      this.getTags();
    });
  }
  onChangeCategory(value: string) {
    let categoriaValue = `${value}_categoria`;
    this.selectedItemCategory = value;
    this.itemSelecionadoEvent.emit(categoriaValue);
  }
  onChangeTag(value: string) {
    let tagValue = `${value}_tag`;
      this.selectedItemTag = value;
      this.itemSelecionadoEvent.emit(tagValue);
  }
  onStatusChange(opt: SelectOption<string> | null): void {
    //console.log('Selecionado:', opt); // aqui você recebe o item inteiro
  }
  ISODate(dt: any): any {
    if ( dt === null || dt === '' ) return null;
    const [datePart, timePart] = dt.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    const dtNew = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${(second || '00').padStart(2, '0')}`;
    return dtNew;
  }
  private brDate(): any {
    const dataHoraAtual = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dia = pad(dataHoraAtual.getDate());
    const mes = pad(dataHoraAtual.getMonth() + 1); // mês começa em 0
    const ano = dataHoraAtual.getFullYear();
    const hora = pad(dataHoraAtual.getHours());
    const minuto = pad(dataHoraAtual.getMinutes());
    const segundo = pad(dataHoraAtual.getSeconds());
    const formatado = `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
    return formatado;
  }
  abrirDialog(ev?: Event) {
    // 1) Remova o foco do gatilho imediatamente (evita “descendant retained focus”)
    (ev?.target as HTMLElement | null)?.blur?.();

    // fallback defensivo
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();

    const dialogRef = this.dialog.open(DialogContentComponent, {
      autoFocus: true,
      width: '100vw',
      height: '100vh',
      data: {
        id: 0,
        name: '',
        uri: [],
        tag: [],
        totalHorasDia: 0,
        status: 'inclusao',
        categoria: this.selectedItemCategory,
        descricao: '',
        dataEntradaManha: this.ISODate(this.brDate()),
        dataSaidaManha: this.ISODate(this.brDate()),
        dataEntradaTarde: this.ISODate(this.brDate()),
        dataSaidaTarde: this.ISODate(this.brDate()),
        dataEntradaNoite: this.ISODate(this.brDate()),
        dataSaidaNoite: this.ISODate(this.brDate()),
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.categoria) {
        this.linkStateService.triggerRefresh();
      }
    });
  }
  getTags(): void {
    this.homeService.getTags().subscribe({
      next: (response: any) => {
        const resp = response;
        //console.log('responseTag', response);
        /*
        const tagObjs = response
          .map((item: any) => item?.tag)
          .filter(isTagObject);
        const allTags = tagObjs
          .flatMap((obj: any) => obj.tags as unknown[])
          .filter((t: any): t is string => typeof t === 'string' && t.trim().length > 0);
        this.tg = [...new Set(allTags)] as string[];        
        this.tg.sort((a: any, b: any) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        this.tg.unshift('todos');
        */
       
        resp.unshift('todos');
        this.statusOptionsTag = (resp ?? []).map((cat: any) => ({
          value: cat,
          label: cat
        }));

      },
      error: (err: HttpErrorResponse) => {
        this.snackService.mostrarMensagem(
          err.message, 'Fechar'
        );
      }
    });
  }
  getCategories(): void {
    this.homeService.getCategorias().subscribe({
      next: (response: any) => {
        const resp = response;
        //console.log('resp -> ', resp);
        //this.links = [...new Set(resp?.map((r: ICategoria) => r.categoria))] as string[];        
        //this.links.sort((a: any, b: any) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        //this.links.unshift('todos');
        //console.log('categorias-> ', this.links);
        resp.unshift('todos');
        this.statusOptionsCat = resp.map((cat: any) => ({
          value: cat,
          label: cat
        }));
      },
      error: (err: HttpErrorResponse) => {
        this.snackService.mostrarMensagem(
          err.message, 'Fechar'
        );
      }
    });
  }
}