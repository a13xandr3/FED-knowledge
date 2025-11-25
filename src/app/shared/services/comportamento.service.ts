import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Comportamento {
  id: string;
  name: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComportamentoService {
  private comportamentosSubject = new BehaviorSubject<Comportamento[]>([]);
  comportamentos$ = this.comportamentosSubject.asObservable();

  adicionar(comportamento: Comportamento): void {
    const atual = this.comportamentosSubject.getValue();
    this.comportamentosSubject.next([...atual, comportamento]);
  }

  limpar(): void {
    this.comportamentosSubject.next([]);
  }

}
