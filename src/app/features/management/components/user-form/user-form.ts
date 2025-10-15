import {Component, Inject, inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {UserService} from '../../../../core/services/user.service';
import {AuthService} from "../../../../core/services/auth.service";
import {MatSnackBar} from '@angular/material/snack-bar';
import {User, UserRole} from '../../../../core/models/user.model';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';
import {NgxMaskDirective} from "ngx-mask";
import {TitleCasePipe} from "@angular/common";

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatDialogActions,
    MatButton,
    MatSlideToggle,
    MatHint,
    MatInput,
    MatSelect,
    MatOption,
    TitleCasePipe,
    MatError,
    NgxMaskDirective
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm implements OnInit {
  // Regex para validar nome completo (pelo menos um nome e um sobrenome)
  private readonly fullNamePattern = '^[a-zA-ZÀ-ú]+(?:\\s[a-zA-ZÀ-ú]+)+$';
  // Regex para validar telefone nos formatos (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
  private readonly phonePattern = '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$';

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  userForm!: FormGroup;
  isEditMode: boolean;
  userRoles: UserRole[] = [];

  constructor(
    public dialogRef: MatDialogRef<UserForm>,
    @Inject(MAT_DIALOG_DATA) public data: { user?: User }
  ) {
    this.isEditMode = !!this.data?.user;
  }

  ngOnInit(): void {
    // Define os perfis que podem ser atribuídos com base no perfil do usuário logado
    const roles: UserRole[] = ['colaborador'];
    if (this.authService.isAdmin()) {
      roles.push('admin');
    }
    // Garante que o perfil atual do usuário em edição esteja sempre na lista
    if (this.isEditMode && this.data.user && !roles.includes(this.data.user.role)) {
      roles.push(this.data.user.role);
    }
    this.userRoles = roles;

    this.userForm = this.fb.group({
      full_name: [this.data?.user?.full_name || '', [
        Validators.required,
        Validators.pattern(this.fullNamePattern)
      ]],
      email: [this.data?.user?.email || '', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
      phone_number: [this.data?.user?.phone_number || '', [
        Validators.required,
        // Validators.pattern(this.phonePattern)
      ]],
      role: [{value: this.data?.user?.role || 'colaborador', disabled: !this.authService.isAdmin()}, Validators.required],
    });

    if (this.isEditMode) {
      this.userForm.addControl('is_active', this.fb.control(this.data.user?.is_active ?? true));
    }
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }
    // Fecha o dialog e passa os dados do formulário para o componente pai.
    this.dialogRef.close(this.userForm.value);
  }
}
