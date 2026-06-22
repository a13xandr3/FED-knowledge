export type DialogContentStatus = 'inclusao' | 'alteracao';

export interface DialogContentData {
  id: number;
  name: string;
  uri: unknown[];
  tag: unknown[];
  totalHorasDia: number | string;
  status: DialogContentStatus;
  categoria: string;
  subCategoria?: string;
  descricao: string;
  oldCategoria?: string;
  showSite?: boolean;
  fileID?: unknown;
  dataEntradaManha: string | null;
  dataSaidaManha: string | null;
  dataEntradaTarde: string | null;
  dataSaidaTarde: string | null;
  dataEntradaNoite: string | null;
  dataSaidaNoite: string | null;
}

export interface DialogContentCloseResult {
  categoria?: string | null;
}
