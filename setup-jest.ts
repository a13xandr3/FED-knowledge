import 'jest-preset-angular/setup-jest';

declare const require: (moduleName: string) => { webcrypto: Crypto };
const { webcrypto } = require('crypto');

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
});
