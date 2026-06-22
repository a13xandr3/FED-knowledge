export type FiltroTipo = 'categoria' | 'tag';

export interface FiltroSelecionado {
  tipo: FiltroTipo;
  valor: string;
}
