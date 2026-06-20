import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

declare const require: (moduleName: string) => any;
const { webcrypto } = require('crypto');
const { TextDecoder, TextEncoder } = require('util');

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
});

Object.defineProperty(globalThis, 'TextDecoder', {
  value: TextDecoder,
  configurable: true,
});

Object.defineProperty(globalThis, 'TextEncoder', {
  value: TextEncoder,
  configurable: true,
});
