import { routes } from './app.routes';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { AuthGuard } from './shared/services/auth.guard';

describe('app.routes', () => {
  it('deve declarar rotas publicas, protegidas e wildcard', () => {
    expect(routes.map(route => route.path)).toEqual(['', 'login', 'home', '**']);
    expect(routes[2].canActivate).toEqual([AuthGuard]);
    expect(routes[2].runGuardsAndResolvers).toBe('always');
    expect(routes[3].redirectTo).toBe('');
  });

  it('deve resolver componentes lazy das rotas', async () => {
    await expect(routes[0].loadComponent?.()).resolves.toBe(LoginComponent);
    await expect(routes[1].loadComponent?.()).resolves.toBe(LoginComponent);
    await expect(routes[2].loadComponent?.()).resolves.toBe(HomeComponent);
  });
});
