import {Component, Inject, inject, OnInit} from '@angular/core';
import {
  AbstractControl,
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
import {finalize} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {CommonModule} from '@angular/common';
import {Attendance, AttendanceAcceptProposal, BillingType} from '../../../../core/models/attendance.model';
import {AttendanceService} from '../../../../core/services/attendance.service';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatIconModule} from '@angular/material/icon';

// Validator function to check for future dates
export function futureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate if there's no date
    }
    const selectedDate = new Date(control.value);
    const today = new Date();
    // Set hours to 0 to compare dates only, preventing issues with timezones
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return {pastDate: true}; // Return error if date is in the past
    }
    return null; // No error
  };
}

@Component({
  selector: 'app-accept-proposal-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDatepickerModule,
    MatIconModule
  ],
  templateUrl: './accept-proposal-form.html',
  styleUrl: './accept-proposal-form.scss'
})
export class AcceptProposalForm implements OnInit {
  private fb = inject(FormBuilder);
  private attendanceService = inject(AttendanceService);
  private snackBar = inject(MatSnackBar);
  private readonly urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-.\/?%&=]*)?$/;

  acceptForm!: FormGroup;
  isSaving = false;
  hasFinancialData: boolean;
  billingType: BillingType;

  constructor(
    public dialogRef: MatDialogRef<AcceptProposalForm>,
    @Inject(MAT_DIALOG_DATA) public data: { attendance: Attendance }
  ) {
    const client = this.data.attendance.client;
    this.hasFinancialData = !!(client.finance_contact_name && client.finance_contact_email && client.finance_contact_phone);
    this.billingType = this.data.attendance.billing_type;
  }

  ngOnInit(): void {
    const attendance = this.data.attendance;
    const isFixedPrice = this.billingType === BillingType.FIXED_PRICE;

    this.acceptForm = this.fb.group({
      // Garante que o valor existente seja carregado no formulário
      total_proposal_value: [attendance.total_proposal_value || null, isFixedPrice ? [Validators.required, Validators.min(0.01)] : []],
      due_date: [attendance.due_date ? new Date(attendance.due_date) : null, [Validators.required, futureDateValidator()]],
      total_hours: [attendance.total_hours || null, [Validators.min(1)]],
      contract_link: [attendance.contract_link || '', [Validators.required, Validators.pattern(this.urlPattern)]],
    });

    if (!this.hasFinancialData) {
      this.acceptForm.disable();
    }
  }

  editClient(): void {
    this.dialogRef.close({ action: 'editClient', clientId: this.data.attendance.client_id });
  }

  onSubmit(): void {
    if (this.acceptForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const formValue = this.acceptForm.getRawValue();
    const payload: AttendanceAcceptProposal = {
      due_date: new Date(formValue.due_date).toISOString(),
      total_hours: formValue.total_hours || null,
      contract_link: formValue.contract_link,
      // Define o valor da proposta com base no tipo de faturamento
      total_proposal_value: this.billingType === BillingType.FIXED_PRICE
        ? formValue.total_proposal_value
        : null,
    };

    this.attendanceService.acceptProposal(this.data.attendance.id, payload).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.snackBar.open('Proposta aceita com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        const message = err.error?.detail || 'Erro ao aceitar proposta. Tente novamente.';
        this.snackBar.open(message, 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      }
    });
  }
}
