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
import {catchError, finalize, forkJoin, of} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {CommonModule} from '@angular/common';
import {FinancialService} from '../../../core/services/financial.service';
import {MatIconModule} from "@angular/material/icon";
import {MatSelectModule} from "@angular/material/select";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {UserDiscountCreate} from "../../../core/models/financial.model";

// Helper function to format date to 'YYYY-MM-DD'
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  private readonly GMAIL_TOOLS_CHARGE: Omit<UserDiscountCreate, 'applied_date'> = { description: 'Ferramentas Gmail', amount: 80.00 };

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

    const today = formatDate(new Date());

    if (quickUserDiscountsValue.gmailTools) {
      payload.push({ ...this.GMAIL_TOOLS_CHARGE, applied_date: today });
    }

    if (customUserDiscountsValue && customUserDiscountsValue.length > 0) {
      const validCustomDiscounts = this.customUserDiscounts.controls
        .filter(control => control.valid)
        .map(control => ({ ...control.value, applied_date: today }));
      payload.push(...validCustomDiscounts);
    }

    if (payload.length === 0) {
      this.snackBar.open('Nenhuma taxa foi adicionada.', 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      this.isSaving = false;
      return;
    }

    // Cria um array de observables, um para cada chamada de API
    const discountRequests = payload.map(discount =>
      this.financialService.addUserDiscount(this.data.userId, discount).pipe(
        catchError(err => {
          console.error(`Falha ao adicionar desconto "${discount.description}"`, err);
          // Retorna um observable de sucesso com um erro para que o forkJoin não pare
          return of({ error: true, description: discount.description });
        })
      )
    );

    // Executa todas as chamadas em paralelo
    forkJoin(discountRequests).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (results) => {
        const failed = results.filter((r: any) => r?.error);
        if (failed.length > 0) {
          const failedDescriptions = failed.map((f: any) => f.description).join(', ');
          this.snackBar.open(
            `Algumas taxas falharam: ${failedDescriptions}. As outras foram salvas.`,
            'Fechar', { duration: 8000, panelClass: 'warning-snackbar' }
          );
        } else {
          this.snackBar.open('Taxa(s) adicionada(s) com sucesso!', 'Fechar', { duration: 3000 });
        }
        this.dialogRef.close(true); // Fecha e recarrega os dados mesmo se houver falha parcial
      },
    });
  }
}
