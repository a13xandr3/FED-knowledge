import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LinkStateService {
  /**
   * Fluxo de atualizações de links.
   * Os componentes podem se inscrever para reagir a mudanças.
   */
  private readonly _refreshLink$ = new BehaviorSubject<boolean>(false);

  /** Observable somente leitura para notificações de atualização. */
  readonly refreshLink$ = this._refreshLink$.asObservable();

  /**
   * Dispara um evento de refresh para que assinantes saibam que devem recarregar os dados.
   */
  triggerRefresh(): void {
    this._refreshLink$.next(true);
  }
}