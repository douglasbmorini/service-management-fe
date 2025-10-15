import {Component, Inject, inject, OnInit} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
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
import {FinancialService} from '../../../core/services/financial.service';
import {MatIconModule} from "@angular/material/icon";
import {MatSelectModule} from "@angular/material/select";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {UserDiscountCreate} from "../../../core/models/financial.model";

@Component({
  selector: 'app-add-user-discount-form',
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
    MatCheckboxModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './add-user-discount-form.component.html',
  styleUrl: './add-user-discount-form.component.scss'
})
export class AddUserDiscountFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private financialService = inject(FinancialService);
  private snackBar = inject(MatSnackBar);

  // Constants for quick user discounts
  private readonly GMAIL_TOOLS_CHARGE: UserDiscountCreate = { description: 'Ferramentas Gmail', amount: 80.00 };

  userDiscountForm!: FormGroup;
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<AddUserDiscountFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { userId: number; userName: string }
  ) {}

  ngOnInit(): void {
    this.userDiscountForm = this.fb.group({
      quickUserDiscounts: this.fb.group({
        gmailTools: [false]
      }),
      customUserDiscounts: this.fb.array([])
    });

    this.userDiscountForm.setValidators(this.atLeastOneUserDiscountValidator());
  }

  get customUserDiscounts(): FormArray {
    return this.userDiscountForm.get('customUserDiscounts') as FormArray;
  }

  addCustomUserDiscount(): void {
    this.customUserDiscounts.push(this.fb.group({
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]]
    }));
  }

  removeCustomUserDiscount(index: number): void {
    this.customUserDiscounts.removeAt(index);
  }

  private atLeastOneUserDiscountValidator() {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const quickUserDiscounts = control.get('quickUserDiscounts')?.value;
      const customUserDiscounts = control.get('customUserDiscounts') as FormArray;

      const hasQuickUserDiscount = quickUserDiscounts && quickUserDiscounts.gmailTools;
      const hasCustomUserDiscount = customUserDiscounts.length > 0;

      return !hasQuickUserDiscount && !hasCustomUserDiscount ? { noUserDiscount: true } : null;
    };
  }

  onSubmit(): void {
    this.userDiscountForm.markAllAsTouched();

    if (this.userDiscountForm.invalid || this.isSaving) {
      this.snackBar.open('Por favor, preencha os campos corretamente ou selecione uma taxa.', 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      return;
    }
    this.isSaving = true;

    const payload: UserDiscountCreate[] = [];
    const quickUserDiscountsValue = this.userDiscountForm.get('quickUserDiscounts')?.value;
    const customUserDiscountsValue = this.userDiscountForm.get('customUserDiscounts')?.value;

    if (quickUserDiscountsValue.gmailTools) {
      payload.push(this.GMAIL_TOOLS_CHARGE);
    }

    if (customUserDiscountsValue && customUserDiscountsValue.length > 0) {
      payload.push(...customUserDiscountsValue);
    }

    if (payload.length === 0) {
      this.snackBar.open('Nenhuma taxa foi adicionada.', 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      this.isSaving = false;
      return;
    }

    this.financialService.addUserDiscount(this.data.userId, payload).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.snackBar.open('Taxa(s) adicionada(s) com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        console.error(err);
        const message = err.error?.detail || 'Erro ao adicionar taxa. Tente novamente.';
        this.snackBar.open(message, 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      }
    });
  }
}
