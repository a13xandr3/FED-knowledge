import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MatDialog } from '@angular/material/dialog';

import { DialogContentComponent } from 'src/app/shared/components/dialog-content/dialog-content.component';

import { LinkStateService } from 'src/app/shared/state/link-state-service';
import { HoraFormatadaPipe } from 'src/app/shared/pipes/hora-formatada.pipe';
import { ErrorStateMatcher } from '@angular/material/core';

import { TokenTimeLeftPipe } from 'src/app/shared/pipes/token-time-left.pipe';
import { TokenExpiringSoonPipe } from 'src/app/shared/pipes/token-expiring-soon.pipe';
import { AppFiltroComponent, FiltroSelecionado } from 'src/app/shared/components/app-filtro/app-filtro.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AppFiltroComponent,
    HoraFormatadaPipe,
    TokenTimeLeftPipe,
    TokenExpiringSoonPipe
  ]
})
export class HeaderComponent {
  @Input() matcher: ErrorStateMatcher = new ErrorStateMatcher();
  @Input() titulo!: string;
  @Input() totalHoras!: any;

  @Output() itemSelecionadoEvent = new EventEmitter<string>();

  selectedItemCategory: string = '';
  selectedItemTag: string = '';

  constructor(
    private linkStateService: LinkStateService,
    private dialog: MatDialog) {
      this.linkStateService.triggerRefresh();
    }

  onFiltroSelecionado(filtro: FiltroSelecionado): void {
    console.log(filtro);
    if (filtro.tipo === 'categoria') {
      this.selectedItemCategory = filtro.valor;
    }

    if (filtro.tipo === 'tag') {
      this.selectedItemTag = filtro.valor;
    }

    this.itemSelecionadoEvent.emit(`${filtro.valor}_${filtro.tipo}`);
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
}
