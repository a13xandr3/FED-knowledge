import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

declare const require: (moduleName: string) => { webcrypto: Crypto };
const { webcrypto } = require('crypto');

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
});
