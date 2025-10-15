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
  private readonly ISS_DISCOUNT: DiscountCreate = { description: 'Imposto Sobre Serviço (ISS)', value: 2, discount_type: 'PERCENTAGE' };

  discountForm!: FormGroup;
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<AddDiscountFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { attendanceId: number; serviceDescription: string }
  ) {}

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

    if (quickDiscountsValue.iss) {
      payload.push(this.ISS_DISCOUNT);
    }

    // Adiciona apenas os descontos personalizados que são válidos
    if (customDiscountsValue && customDiscountsValue.length > 0) {
      // Filtra para garantir que apenas grupos de formulário válidos sejam adicionados
      const validCustomDiscounts = this.customDiscounts.controls
        .filter(control => control.valid)
        .map(control => control.value);
      payload.push(...validCustomDiscounts);
    }

    this.financialService.addDiscount(this.data.attendanceId, payload).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.snackBar.open('Desconto adicionado com sucesso!', 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        const message = err.error?.detail || 'Erro ao adicionar desconto. Tente novamente.';
        this.snackBar.open(message, 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      }
    });
  }
}
