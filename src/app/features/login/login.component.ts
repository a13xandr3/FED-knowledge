import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';

import { AuthService, LoginPayload } from 'src/app/shared/services/auth.service';
import { SnackService } from 'src/app/shared/services/snack.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ]
})
export class LoginComponent {

  /**
   * Envia username/password/totp em plain-text no body, conforme JSON.
   * Não gera token, nem mexe com armazenamento; isso fica no AuthService /
   */
  
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    totp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snackService: SnackService
  ) {}

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
  get totp() { return this.loginForm.get('totp'); }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const payload: LoginPayload = {
      username: this.email!.value!,
      password: this.password!.value!,
      totp: this.totp!.value!
    };
    this.auth.login(payload).pipe(
      tap(() => {
        this.router.navigate(['/home'], {
          queryParams: { titulo: 'Knowledge Base' }
        });
      }),
      catchError(err => {
        console.error('[Login] Erro na autenticação', err);
        this.snackService.mostrarMensagem('Login e/ou senha ou código incorretos', 'Fechar');
        return of(null);
      })
    ).subscribe();
  }
}
