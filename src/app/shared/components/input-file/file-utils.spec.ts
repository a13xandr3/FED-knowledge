import { base64ToUint8, sha256Hex, sha256HexOfString, toArrayBuffer, restoreFilesFromSnapshot, ProcessedSnapshot } from './file-utils';
import { gzip } from 'pako';

// Helper to convert Uint8Array to base64 string without data URI prefix
function u8ToBase64(u8: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

describe('file-utils', () => {
  it('base64ToUint8 should decode base64 into correct bytes', () => {
    const b64 = btoa('Hello');
    const bytes = base64ToUint8(b64);
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it('sha256Hex should hash a BufferSource correctly', async () => {
    const msg = new TextEncoder().encode('abc');
    const hash = await sha256Hex(msg);
    // expected SHA‑256 of "abc"
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('sha256HexOfString should hash a string correctly', async () => {
    const hash = await sha256HexOfString('abc');
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('toArrayBuffer should return a pure ArrayBuffer from a TypedArray', () => {
    const u8 = new Uint8Array([1, 2, 3, 4]);
    const ab = toArrayBuffer(u8);
    expect(ab.byteLength).toBe(4);
    // underlying ArrayBuffer of u8 is of length 4 as well but we want a new view
    const out = new Uint8Array(ab);
    expect(Array.from(out)).toEqual([1, 2, 3, 4]);
  });

  it('restoreFilesFromSnapshot should reconstruct original and gzip files and validate hash', async () => {
    const text = 'Test content';
    const encoder = new TextEncoder();
    const u8 = encoder.encode(text);
    const gz = gzip(u8); // returns Uint8Array
    const base64Gzip = u8ToBase64(gz);
    const hash = await sha256HexOfString(base64Gzip);
    const snap: ProcessedSnapshot = {
      filename: 'test.txt',
      mimeType: 'text/plain',
      sizeBytes: u8.length,
      gzipSizeBytes: gz.length,
      base64Gzip,
      hashMode: 'base64',
      hashSha256Hex: hash
    };
    const { gzipFile, originalFile, hashOk } = await restoreFilesFromSnapshot(snap, true);
    expect(hashOk).toBeTrue();
    // Check filenames
    expect(gzipFile.name).toBe('test.txt.gz');
    expect(originalFile.name).toBe('test.txt');
    // Check content by reading original file's text
    const restoredText = await originalFile.text();
    expect(restoredText).toBe(text);
  });
});