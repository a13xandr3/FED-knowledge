import { environment as devEnv } from './environment';
import { environment as prodEnv } from './environment.prod';

describe('Environment configurations', () => {
  it('development environment should have production set to false', () => {
    expect(devEnv.production).toBeFalsy();
  });

  it('production environment should have production set to true', () => {
    expect(prodEnv.production).toBeTruthy();
  });
});