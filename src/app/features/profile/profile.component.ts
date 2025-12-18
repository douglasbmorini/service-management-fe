import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from "@angular/forms";
import {AuthService} from '../../core/services/auth.service';
import {UserService} from '../../core/services/user.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {finalize} from 'rxjs';
import {CommonModule} from "@angular/common";
import {MatCardModule} from "@angular/material/card";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {NgxMaskDirective} from "ngx-mask";
import {MatIconModule} from "@angular/material/icon";
import {ImmediateErrorStateMatcher} from "../../../app/shared/utils/form-utils";

// Validador customizado para senhas que devem corresponder
export function passwordMatchValidator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    // Se a senha principal não foi preenchida, não há o que comparar.
    // O validador 'required' do outro campo cuidará disso se necessário.
    if (!password && !confirmPassword) {
      return null;
    }

    // Retorna um erro se as senhas não corresponderem.
    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    NgxMaskDirective,
    MatIconModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  profileForm!: FormGroup;
  isSaving = false;
  hidePassword = true;
  immediateErrorMatcher = new ImmediateErrorStateMatcher();

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();

    this.profileForm = this.fb.group({
      full_name: [currentUser?.full_name || '', Validators.required],
      email: [currentUser?.email || '', [Validators.required, Validators.email]],
      phone_number: [currentUser?.phone_number || '', Validators.required],
      passwordGroup: this.fb.group({
        password: ['', [Validators.minLength(8)]],
        confirmPassword: ['']
      }, { validators: passwordMatchValidator() })
    });

    // Lógica reativa para validação condicional
    const passwordControl = this.profileForm.get('passwordGroup.password');
    const confirmPasswordControl = this.profileForm.get('passwordGroup.confirmPassword');

    passwordControl?.valueChanges.subscribe(value => {
      if (value) {
        confirmPasswordControl?.setValidators(Validators.required);
      } else {
        confirmPasswordControl?.clearValidators();
      }
      confirmPasswordControl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.snackBar.open('Por favor, corrija os erros no formulário.', 'Fechar', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    const formValue = this.profileForm.value;

    const payload: any = {
      full_name: formValue.full_name,
      email: formValue.email,
      phone_number: formValue.phone_number,
    };

    // Adiciona a senha ao payload apenas se ela foi preenchida
    if (formValue.passwordGroup.password) {
      payload.password = formValue.passwordGroup.password;
    }

    this.userService.updateCurrentUser(payload).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (updatedUser) => {
        // Atualiza o estado do usuário no AuthService
        this.authService.state.update(s => ({ ...s, user: updatedUser }));
        this.snackBar.open('Perfil atualizado com sucesso!', 'Fechar', { duration: 3000 });

        // Limpa os campos de senha após o sucesso
        this.profileForm.get('passwordGroup')?.reset();
      },
      error: (err) => {
        const message = err.error?.detail || 'Erro ao atualizar o perfil.';
        this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
      }
    });
  }
}