import { normalizeChipValue } from './mat-chips-value.util';

describe('mat-chips-value.util', () => {
  it('deve normalizar valores vazios', () => {
    expect(normalizeChipValue(null)).toEqual([]);
    expect(normalizeChipValue(undefined)).toEqual([]);
    expect(normalizeChipValue('')).toEqual([]);
  });

  it('deve normalizar arrays mistos', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    expect(normalizeChipValue(['a', 1, null, { value: 'b' }, { tag: 'c' }, { uri: 'd' }, { other: 'e' }]))
      .toEqual(['a', '1', 'b', 'c', 'd', '{"other":"e"}']);
    expect(normalizeChipValue([false, circular])).toEqual([]);
  });

  it('deve normalizar objetos com tags, uris ou value', () => {
    expect(normalizeChipValue({ tags: ['a', { value: 'b' }] })).toEqual(['a', 'b']);
    expect(normalizeChipValue({ uris: ['http://a'] })).toEqual(['http://a']);
    expect(normalizeChipValue({ value: 'x' })).toEqual(['x']);
    expect(normalizeChipValue({ other: 'x' })).toEqual([]);
  });

  it('deve normalizar string e numero unico', () => {
    expect(normalizeChipValue(' chip ')).toEqual(['chip']);
    expect(normalizeChipValue('   ')).toEqual([]);
    expect(normalizeChipValue(0)).toEqual(['0']);
    expect(normalizeChipValue(false)).toEqual([]);
  });
});
