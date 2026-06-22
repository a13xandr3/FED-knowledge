import { createFilterOptions } from './filter-options.util';

describe('filter-options.util', () => {
  it('deve criar opções com "todos" no início', () => {
    expect(createFilterOptions(['TI', 'angular'])).toEqual([
      { value: 'todos', label: 'todos' },
      { value: 'TI', label: 'TI' },
      { value: 'angular', label: 'angular' },
    ]);
  });

  it('deve ignorar valores não textuais da resposta', () => {
    expect(createFilterOptions(['TI', 123, null, 'angular'])).toEqual([
      { value: 'todos', label: 'todos' },
      { value: 'TI', label: 'TI' },
      { value: 'angular', label: 'angular' },
    ]);
  });

  it('deve retornar apenas a opção padrão quando a resposta não for array', () => {
    expect(createFilterOptions({ value: 'TI' })).toEqual([
      { value: 'todos', label: 'todos' },
    ]);
  });
});
