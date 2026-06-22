describe('main bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.dontMock('@angular/core');
    jest.dontMock('@angular/platform-browser');
    jest.dontMock('src/environments/environment');
  });

  it('deve inicializar aplicacao em ambiente de desenvolvimento', async () => {
    const { bootstrapApplication, enableProdMode } = await importMain(false);

    expect(enableProdMode).not.toHaveBeenCalled();
    expect(bootstrapApplication).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ providers: expect.any(Array) }),
    );
  });

  it('deve habilitar modo producao quando environment.production for true', async () => {
    const { enableProdMode } = await importMain(true);

    expect(enableProdMode).toHaveBeenCalled();
  });

  it('deve registrar erro quando bootstrap falhar', async () => {
    const bootError = new Error('bootstrap');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await importMain(false, Promise.reject(bootError));
    await Promise.resolve();

    expect(consoleError).toHaveBeenCalledWith(bootError);
  });
});

async function importMain(production: boolean, bootstrapResult: Promise<unknown> = Promise.resolve({})): Promise<{
  bootstrapApplication: jest.Mock;
  enableProdMode: jest.Mock;
}> {
  jest.resetModules();

  const bootstrapApplication = jest.fn(() => bootstrapResult);
  const enableProdMode = jest.fn();

  jest.doMock('@angular/platform-browser', () => ({
    ...jest.requireActual('@angular/platform-browser'),
    bootstrapApplication,
  }));
  jest.doMock('@angular/core', () => ({
    ...jest.requireActual('@angular/core'),
    enableProdMode,
  }));
  jest.doMock('src/environments/environment', () => ({
    environment: {
      bffUrl: 'http://localhost:8080',
      production,
    },
  }));

  await import('./main');
  await Promise.resolve();

  return { bootstrapApplication, enableProdMode };
}
