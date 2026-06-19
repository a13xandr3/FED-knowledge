import { tokenInterceptor } from './token.interceptor.service';

describe('tokenInterceptor', () => {
  it('should export the functional interceptor', () => {
    expect(tokenInterceptor).toBeTruthy();
  });
});
