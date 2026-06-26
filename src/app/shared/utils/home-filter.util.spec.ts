import { getTagValues, hasTagValues, parseSelectedFilter, toFileIds } from './home-filter.util';

describe('home-filter.util', () => {
  it('deve parsear filtro selecionado', () => {
    expect(parseSelectedFilter('TI_categoria')).toEqual({ tipo: 'categoria', valor: 'TI' });
    expect(parseSelectedFilter('angular_tag')).toEqual({ tipo: 'tag', valor: 'angular' });
  });

  it('deve extrair tags de diferentes formatos', () => {
    expect(getTagValues(null)).toEqual([]);
    expect(getTagValues(['a', 'b'])).toEqual(['a', 'b']);
    expect(getTagValues([{ tags: ['c'] }, {}, { tags: ['d', 'e'] }])).toEqual(['c', 'd', 'e']);
    expect(getTagValues({ tags: ['x'] })).toEqual(['x']);
    expect(getTagValues({})).toEqual([]);
  });

  it('deve indicar existencia de tags', () => {
    expect(hasTagValues({ tags: ['x'] })).toBe(true);
    expect(hasTagValues(null)).toBe(false);
  });

  it('deve normalizar referencias de arquivos para ids', () => {
    expect(toFileIds([{ id: 1 }, { id: 2 }])).toEqual([1, 2]);
    expect(toFileIds([3, 4])).toEqual([3, 4]);
    expect(toFileIds({ id: 5 })).toEqual([5]);
    expect(toFileIds(6)).toEqual([6]);
    expect(toFileIds(null)).toEqual([]);
  });
});
