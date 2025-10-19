import {Component, Inject, inject, OnInit} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import {combineLatest, finalize, map, Observable, shareReplay, startWith} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatSelectModule} from '@angular/material/select';
import {AsyncPipe, CommonModule, CurrencyPipe} from "@angular/common";
import {Attendance, AttendanceStartExecution, BillingType} from '../../../../core/models/attendance.model';
import {AttendanceService} from "../../../../core/services/attendance.service";
import {User} from "../../../../core/models/user.model";
import {UserService} from '../../../../core/services/user.service';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-start-execution-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    AsyncPipe,
    CurrencyPipe,
  ],
  templateUrl: './start-execution-form.html',
  styleUrl: './start-execution-form.scss'
})
export class StartExecutionForm implements OnInit {
  // Re-added the inject for AttendanceService
  private fb = inject(FormBuilder);
  private attendanceService = inject(AttendanceService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  startExecutionForm!: FormGroup;
  isSaving = false;
  availableCollaborators$: Observable<User[]>;
  billingType: BillingType;

  constructor(
    public dialogRef: MatDialogRef<StartExecutionForm>,
    @Inject(MAT_DIALOG_DATA) public data: { attendance: Attendance }
  ) {
    this.availableCollaborators$ = this.userService.getUsers()
      .pipe(
      // Filtra a lista para incluir apenas usuários com o perfil 'colaborador'
      map(users => users.filter(user => user.role === 'colaborador')),
      shareReplay(1) // Cache the result and share it among subscribers
    );
    this.billingType = this.data.attendance.billing_type; // Correto
  }

  ngOnInit(): void {
    this.startExecutionForm = this.fb.group({
      collaborators: this.fb.array([], [Validators.required, Validators.minLength(1)])
    });

    // Aplica o validador financeiro apenas para projetos de preço fixo (Correto)
    if (this.billingType === 'FIXED_PRICE') {
      this.collaborators.setValidators(this.financialValueValidator(this.data.attendance.total_proposal_value || 0));
    }
  }

  get collaborators(): FormArray {
    return this.startExecutionForm.get('collaborators') as FormArray;
  }

  addCollaborator(): void {
    const collaboratorGroup = this.fb.group({ // Tipagem inferida aqui
      user_id: ['', Validators.required],
      financial_value: [null as number | null], // Inicializa como nulo
      hourly_rate: [null as number | null]      // Inicializa como nulo
    });
    if (this.billingType === BillingType.FIXED_PRICE) {
      collaboratorGroup.get('financial_value')?.setValidators([Validators.required, Validators.min(0.01)]);
    } else { // HOURLY
      collaboratorGroup.get('hourly_rate')?.setValidators([Validators.required, Validators.min(0.01)]);
    }
    this.collaborators.push(collaboratorGroup);
  }

  removeCollaborator(index: number): void {
    this.collaborators.removeAt(index);
  }

  getFilteredCollaborators(rowIndex: number): Observable<User[]> {
    return combineLatest([
      this.availableCollaborators$,
      // O startWith garante que o observable emita um valor inicial, antes de qualquer mudança
      this.collaborators.valueChanges.pipe(startWith(this.collaborators.value))
    ]).pipe(
      map(([allUsers, selectedValues]) => {
        // Pega os IDs de todos os outros campos de select
        const selectedIds = selectedValues
          .map((value: any, index: number) => index !== rowIndex ? value.user_id : null)
          .filter((id: number | null) => id); // Filtra nulos ou vazios

        // Retorna apenas os usuários que ainda não foram selecionados
        return allUsers.filter(user => !selectedIds.includes(user.id));
      })
    );
  }

  private financialValueValidator(totalProposalValue: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!(control instanceof FormArray) || control.length === 0) {
        return null;
      }

      const sumOfValues = control.controls.reduce((acc, curr) => acc + (curr.get('financial_value')?.value || 0), 0);

      // Usamos uma pequena margem (epsilon) para comparações de ponto flutuante
      const epsilon = 0.001;

      if (Math.abs(sumOfValues - totalProposalValue) > epsilon) {
        // Se a soma for diferente do valor total da proposta, retorna um erro.
        return { sumMismatch: { total: totalProposalValue, current: sumOfValues } };
      }

      return null; // Sem erros
    };
  }

  onSubmit(): void {
    if (this.startExecutionForm.invalid || this.isSaving) {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios corretamente.', 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      return;
    }

    this.isSaving = true;

    // Limpa o payload para enviar apenas os campos relevantes para o tipo de faturamento
    const collaboratorsPayload = this.startExecutionForm.getRawValue().collaborators.map((collab: any) => {
      if (this.billingType === BillingType.FIXED_PRICE) {
        delete collab.hourly_rate;
      } else { // HOURLY
        delete collab.financial_value;
      }
      return collab;
    });

    const payload: AttendanceStartExecution = {
      collaborators: collaboratorsPayload
    };

    this.attendanceService.startExecution(this.data.attendance.id, payload).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.snackBar.open('Execução do atendimento iniciada com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        console.error(err);
        const message = err.error?.detail || 'Erro ao iniciar execução. Verifique os dados e tente novamente.';
        this.snackBar.open(message, 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      }
    });
  }
}
