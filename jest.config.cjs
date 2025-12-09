const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
module.exports = {
  // carrega transform, testEnvironment, etc, próprio para Angular
  ...createCjsPreset(),

  // aponta para o setup que inicializa Zone + Angular TestBed
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  // opcional, mas deixa explícito
  testEnvironment: 'jsdom',

  // garante que só pegue specs do src e não o antigo test.ts do Karma
  testMatch: ['<rootDir>/src/**/*.spec.ts'],

  // para evitar conflito com o antigo test runner do Angular
  testPathIgnorePatterns: ['<rootDir>/src/test.ts'],

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};