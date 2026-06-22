import { IactionStatus } from 'src/app/shared/request/request';
import { DialogContentData } from 'src/app/shared/interfaces/dialog-content-data.interface';

export function createHomeDialogData(
  item: IactionStatus,
  totalHorasDia: number,
  showSite?: boolean
): DialogContentData {
  return {
    id: item.id,
    name: item.name,
    uri: [item.uri],
    status: 'alteracao',
    categoria: item.categoria,
    descricao: item.descricao,
    tag: [item.tag],
    fileID: [item.fileID],
    subCategoria: item.subCategoria,
    showSite,
    dataEntradaManha: item.dataEntradaManha,
    dataSaidaManha: item.dataSaidaManha,
    dataEntradaTarde: item.dataEntradaTarde,
    dataSaidaTarde: item.dataSaidaTarde,
    dataEntradaNoite: item.dataEntradaNoite,
    dataSaidaNoite: item.dataSaidaNoite,
    totalHorasDia,
  };
}
