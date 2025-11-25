import { extractIds, idToFilename, diffRemovedIds, upsertFileRef, removeById, mergeExistingAndNew, FileRef, PreviewItem } from './file-selection.util';

describe('file-selection.util', () => {
  describe('extractIds', () => {
    it('should extract valid numeric ids from previews preserving order', () => {
      const previews: PreviewItem[] = [
        { id: 3, url: 'u', filename: 'a', sizeBytes: 10 },
        { id: undefined, url: 'v', filename: 'b', sizeBytes: 10 },
        { id: 5, url: 'w', filename: 'c', sizeBytes: 10 },
        { id: NaN as any, url: 'x', filename: 'd', sizeBytes: 10 },
        { id: -2, url: 'y', filename: 'e', sizeBytes: 10 },
      ];
      // only finite positive numbers should be extracted
      expect(extractIds(previews)).toEqual([3, 5]);
    });
  });

  describe('idToFilename', () => {
    it('should build a map of id to filename', () => {
      const previews: PreviewItem[] = [
        { id: 1, url: 'u', filename: 'foo.txt', sizeBytes: 10 },
        { id: 2, url: 'v', filename: 'bar.csv', sizeBytes: 10 },
        { id: undefined, url: 'w', filename: 'baz.png', sizeBytes: 10 }
      ];
      const map = idToFilename(previews);
      expect(map.get(1)).toBe('foo.txt');
      expect(map.get(2)).toBe('bar.csv');
      // undefined id should not be inserted
      expect(map.has(NaN)).toBeFalse();
    });
  });

  describe('diffRemovedIds', () => {
    it('should return ids present in prev but not in curr', () => {
      const prev = [1, 2, 3, 4];
      const curr = [2, 4];
      expect(diffRemovedIds(prev, curr)).toEqual([1, 3]);
    });
  });

  describe('upsertFileRef', () => {
    it('should insert when id not present and update when id exists', () => {
      const list: FileRef[] = [
        { id: 1, filename: 'foo' },
        { id: 2, filename: 'bar' }
      ];
      // insert new id
      const inserted = upsertFileRef(list, { id: 3, filename: 'baz' });
      expect(inserted.length).toBe(3);
      expect(inserted.some(r => r.id === 3 && r.filename === 'baz')).toBeTrue();
      // update existing id
      const updated = upsertFileRef(inserted, { id: 2, filename: 'updated-bar' });
      expect(updated.length).toBe(3);
      expect(updated.some(r => r.id === 2 && r.filename === 'updated-bar')).toBeTrue();
    });
  });

  describe('removeById', () => {
    it('should remove the matching id and keep others', () => {
      const list: FileRef[] = [
        { id: 1, filename: 'foo' },
        { id: 2, filename: 'bar' },
        { id: 3, filename: 'baz' }
      ];
      const result = removeById(list, 2);
      expect(result).toEqual([
        { id: 1, filename: 'foo' },
        { id: 3, filename: 'baz' }
      ]);
    });
  });

  describe('mergeExistingAndNew', () => {
    it('should merge existing and new file references', () => {
      const existingIds = [1, 2];
      const idNameMap = new Map<number, string>([
        [1, 'foo.txt'],
        [2, 'bar.txt']
      ]);
      const newRefs: FileRef[] = [
        { id: 2, filename: 'new-bar.txt' }, // will override existing id 2
        { id: 3, filename: 'baz.txt' }
      ];
      const payload = mergeExistingAndNew(existingIds, idNameMap, newRefs);
      // resulting files should have ids 1, 2, 3 with correct filenames
      const namesById = new Map(payload.files.map(f => [f.id, f.filename]));
      expect(namesById.get(1)).toBe('foo.txt');
      // id 2 should come from newRefs
      expect(namesById.get(2)).toBe('new-bar.txt');
      expect(namesById.get(3)).toBe('baz.txt');
    });
  });
});