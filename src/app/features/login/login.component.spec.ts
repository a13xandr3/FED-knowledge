import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService, LoginPayload } from 'src/app/shared/services/auth.service';
import { SnackService } from 'src/app/shared/services/snack.service';

describe('LoginComponent (standalone + Jest)', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const authServiceMock = {
    login: jest.fn()
  };

  const routerMock = {
    navigate: jest.fn()
  };

  const snackServiceMock = {
    mostrarMensagem: jest.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: SnackService, useValue: snackServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    jest.clearAllMocks();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('form deve iniciar inválido', () => {
    expect(component.loginForm.valid).toBe(false);
    expect(component.email?.value).toBe('');
    expect(component.password?.value).toBe('');
    expect(component.totp?.value).toBe('');
  });

  it('getters devem retornar os controls corretos', () => {
    expect(component.email).toBe(component.loginForm.get('email'));
    expect(component.password).toBe(component.loginForm.get('password'));
    expect(component.totp).toBe(component.loginForm.get('totp'));
  });

  it('onSubmit com formulário inválido deve apenas marcar touched e não chamar AuthService', () => {
    const markAllAsTouchedSpy = jest.spyOn(component.loginForm, 'markAllAsTouched');
    component.onSubmit();
    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('onSubmit com formulário válido deve chamar AuthService.login e navegar para /home', () => {
    // Arrange: preencher form com valores válidos
    component.loginForm.setValue({
      email: 'user@test.com',
      password: '123456',
      totp: '123456'
    });

    const payloadEsperado: LoginPayload = {
      username: 'user@test.com',
      password: '123456',
      totp: '123456'
    };

    (authServiceMock.login as jest.Mock).mockReturnValue(of({}));

    // Act
    component.onSubmit();

    // Assert
    expect(authServiceMock.login).toHaveBeenCalledTimes(1);
    expect(authServiceMock.login).toHaveBeenCalledWith(payloadEsperado);

    expect(routerMock.navigate).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).toHaveBeenCalledWith(
      ['/home'],
      { queryParams: { titulo: 'Knowledge Base' } }
    );

    expect(snackServiceMock.mostrarMensagem).not.toHaveBeenCalled();
  });

  it('onSubmit deve exibir mensagem de erro quando AuthService.login lançar erro', () => {
    component.loginForm.setValue({
      email: 'user@test.com',
      password: '123456',
      totp: '123456'
    });

    const erro = new Error('401 Unauthorized');

    (authServiceMock.login as jest.Mock).mockReturnValue(
      throwError(() => erro)
    );

    component.onSubmit();

    // mensagem amigável definida no componente
    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledTimes(1);
    expect(snackServiceMock.mostrarMensagem).toHaveBeenCalledWith(
      'Login e/ou senha ou código incorretos',
      'Fechar'
    );

    // não deve navegar em caso de erro
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
