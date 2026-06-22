import { createHeaderDialogData, toLocalIsoDateTime } from './header-dialog-data.factory';

describe('header-dialog-data.factory', () => {
  it('deve criar dados iniciais do dialog com a categoria selecionada', () => {
    const currentDate = new Date(2026, 0, 2, 3, 4, 5);

    const data = createHeaderDialogData('Timesheet', currentDate);

    expect(data).toEqual({
      id: 0,
      name: '',
      uri: [],
      tag: [],
      totalHorasDia: 0,
      status: 'inclusao',
      categoria: 'Timesheet',
      descricao: '',
      dataEntradaManha: '2026-01-02T03:04:05',
      dataSaidaManha: '2026-01-02T03:04:05',
      dataEntradaTarde: '2026-01-02T03:04:05',
      dataSaidaTarde: '2026-01-02T03:04:05',
      dataEntradaNoite: '2026-01-02T03:04:05',
      dataSaidaNoite: '2026-01-02T03:04:05',
    });
  });

  it('deve formatar data local em ISO sem timezone', () => {
    const currentDate = new Date(2026, 10, 9, 8, 7, 6);

    expect(toLocalIsoDateTime(currentDate)).toBe('2026-11-09T08:07:06');
  });
});
