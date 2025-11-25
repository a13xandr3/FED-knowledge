import { environment } from './environment.prod';

describe('environment.prod', () => {
  it('should have production set to true', () => {
    expect(environment.production).toBeTrue();
  });
});