import { isBlank, normalizeText, trackById, toISODate, parseNumberSafe, handleHttpError } from './common';

describe('common utility functions', () => {
  it('should correctly identify blank values', () => {
    expect(isBlank(undefined)).toBeTruthy();
    expect(isBlank(null)).toBeTruthy();
    expect(isBlank('   ')).toBeTruthy();
    expect(isBlank('test')).toBeFalsy();
  });

  it('should normalize text (remove diacritics and lowercase)', () => {
    expect(normalizeText('Árvore')).toBe('arvore');
  });

  it('should return id in trackById or fallback to index', () => {
    const item = { id: 5 };
    expect(trackById(0, item)).toBe(5);
    const noId = {} as any;
    expect(trackById(2, noId)).toBe(2);
  });

  it('should convert dates to ISO strings', () => {
    const date = new Date('2023-01-01T00:00:00Z');
    expect(toISODate(date)).toContain('2023-01-01');
  });

  it('should safely parse numbers with fallback', () => {
    expect(parseNumberSafe('10', 0)).toBe(10);
    expect(parseNumberSafe('not a number', 5)).toBe(5);
  });

  it('should throw an Error with proper message in handleHttpError', () => {
    expect(() => handleHttpError({ message: 'Failed' })).toThrow('Failed');
    expect(() => handleHttpError({ error: { message: 'Inner' } })).toThrow('Inner');
  });
});