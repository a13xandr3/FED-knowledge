import { createHomeDialogData } from './home-dialog-data.factory';
import { IactionStatus } from 'src/app/shared/request/request';

describe('home-dialog-data.factory', () => {
  it('deve criar dados do dialog de alteracao', () => {
    const item = {
      id: 1,
      name: 'Card',
      uri: { uris: ['http://site'] },
      categoria: 'TI',
      subCategoria: 'Angular',
      descricao: 'Descricao',
      tag: { tags: ['tag'] },
      fileID: { fileRefs: [{ id: 10, filename: 'a.txt' }] },
      status: 'alteracao',
      horas: '',
      dataEntradaManha: '2026-01-01T08:00:00',
      dataSaidaManha: '2026-01-01T09:00:00',
      dataEntradaTarde: '2026-01-01T13:00:00',
      dataSaidaTarde: '2026-01-01T14:00:00',
      dataEntradaNoite: '2026-01-01T20:00:00',
      dataSaidaNoite: '2026-01-01T21:00:00',
    } as IactionStatus;

    expect(createHomeDialogData(item, 3, true)).toEqual({
      id: 1,
      name: 'Card',
      uri: [item.uri],
      status: 'alteracao',
      categoria: 'TI',
      descricao: 'Descricao',
      tag: [item.tag],
      fileID: [item.fileID],
      subCategoria: 'Angular',
      showSite: true,
      dataEntradaManha: '2026-01-01T08:00:00',
      dataSaidaManha: '2026-01-01T09:00:00',
      dataEntradaTarde: '2026-01-01T13:00:00',
      dataSaidaTarde: '2026-01-01T14:00:00',
      dataEntradaNoite: '2026-01-01T20:00:00',
      dataSaidaNoite: '2026-01-01T21:00:00',
      totalHorasDia: 3,
    });
  });
});
