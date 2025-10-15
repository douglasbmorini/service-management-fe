import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {finalize} from 'rxjs';
import {AuthService} from '../../../core/services/auth.service';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    NgOptimizedImage,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);

  loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const credentials = {
        username: this.loginForm.value.username!,
        password: this.loginForm.value.password!
      };
      this.authService.login(credentials).pipe(
        finalize(() => this.isLoading.set(false))
      ).subscribe({
        next: () => this.router.navigate(['/']),
        error: (err) => {
          // Tenta usar a mensagem de erro da API, senão usa uma mensagem padrão.
          const errorMessage = err.error?.detail || 'Email ou senha inválidos. Tente novamente.';
          // Exibe uma mensagem de erro clara para o usuário
          this.snackBar.open(errorMessage, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
        }
      });
    }
  }
}
