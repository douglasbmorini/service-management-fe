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
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatSelectModule} from "@angular/material/select";
import {MatIconModule} from "@angular/material/icon";
import {DiscountCreate} from "../../../core/models/financial.model";

// Helper function to format date to 'YYYY-MM-DD'
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

@Component({
  selector: 'app-add-discount-form',
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
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './add-discount-form.component.html',
  styleUrl: './add-discount-form.component.scss'
})
export class AddDiscountFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private financialService = inject(FinancialService);
  private snackBar = inject(MatSnackBar);

  // Constants for quick discounts
  private readonly ISS_DISCOUNT: Omit<DiscountCreate, 'applied_date'> = { description: 'Imposto Sobre Serviço (ISS)', value: 2, discount_type: 'PERCENTAGE' };

  discountForm!: FormGroup;
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<AddDiscountFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { attendanceId: number; serviceDescription: string; }
  ) {
  }

  ngOnInit(): void {
    this.discountForm = this.fb.group({
      quickDiscounts: this.fb.group({
        iss: [false]
      }),
      customDiscounts: this.fb.array([])
    });

    // Add a custom validator to ensure at least one discount is provided
    this.discountForm.setValidators(this.atLeastOneDiscountValidator());
  }

  get customDiscounts(): FormArray {
    return this.discountForm.get('customDiscounts') as FormArray;
  }

  addCustomDiscount(): void {
    this.customDiscounts.push(this.fb.group({
      description: ['', Validators.required],
      value: [null, [Validators.required, Validators.min(0.01)]],
      discount_type: ['FIXED', Validators.required]
    }));
  }

  removeCustomDiscount(index: number): void {
    this.customDiscounts.removeAt(index);
  }

  private atLeastOneDiscountValidator() {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const quickDiscounts = control.get('quickDiscounts')?.value;
      const customDiscounts = control.get('customDiscounts') as FormArray;

      const hasQuickDiscount = quickDiscounts && quickDiscounts.iss;
      const hasCustomDiscount = customDiscounts.length > 0;

      return !hasQuickDiscount && !hasCustomDiscount ? { noDiscount: true } : null;
    };
  }

  onSubmit(): void {
    this.discountForm.markAllAsTouched(); // Garante que os erros de validação apareçam

    if (this.discountForm.invalid || this.isSaving) {
      this.snackBar.open('Por favor, preencha os campos corretamente ou selecione um desconto.', 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      return;
    }
    this.isSaving = true;

    const payload: DiscountCreate[] = [];
    const quickDiscountsValue = this.discountForm.get('quickDiscounts')?.value;
    const customDiscountsValue = this.discountForm.get('customDiscounts')?.value;

    const today = formatDate(new Date());

    if (quickDiscountsValue.iss) {
      payload.push({ ...this.ISS_DISCOUNT, applied_date: today });
    }

    // Adiciona apenas os descontos personalizados que são válidos
    if (customDiscountsValue && customDiscountsValue.length > 0) {
      // Filtra para garantir que apenas grupos de formulário válidos sejam adicionados
      const validCustomDiscounts = this.customDiscounts.controls
        .filter(control => control.valid)
        .map(control => ({ ...control.value, applied_date: today }));
      payload.push(...validCustomDiscounts);
    }

    if (payload.length === 0) {
      this.snackBar.open('Nenhum desconto foi adicionado.', 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      this.isSaving = false;
      return;
    }

    this.financialService.addDiscount(this.data.attendanceId, payload).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.snackBar.open('Desconto adicionado com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
    });
  }
}
