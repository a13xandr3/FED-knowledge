/*
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { TwofaService } from '../services/twofa.service';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let twofaSpy: jasmine.SpyObj<TwofaService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['login']);
    twofaSpy = jasmine.createSpyObj('TwofaService', ['verify']);

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: TwofaService, useValue: twofaSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve validar senha forte corretamente', () => {
    const ctrl = component.loginForm.get('password');
    ctrl?.setValue('Fr@me2025');
    expect(ctrl?.valid).toBeTrue();
  });

  it('deve falhar com senha fraca', () => {
    const ctrl = component.loginForm.get('password');
    ctrl?.setValue('12345');
    expect(ctrl?.valid).toBeFalse();
  });

  it('deve acionar 2FA após login bem-sucedido', () => {
    authSpy.login.and.returnValue(of({}));
    component.loginForm.setValue({ email: 'a@b.com', password: 'Fr@me2025' });
    component.onSubmit();
    expect(component.step2fa).toBeTrue();
  });

  it('deve tratar erro de login', () => {
    authSpy.login.and.returnValue(throwError(() => new Error('falha')));
    component.onSubmit();
    expect(authSpy.login).toHaveBeenCalled();
  });
});
*/