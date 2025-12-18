import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTableModule} from '@angular/material/table';
import {Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {FinancialService} from '../../../core/services/financial.service';
import {FinancialClosing} from '../../../core/models/financial.model';
import {AuthService} from '../../../core/services/auth.service';
import {MatProgressBarModule} from '@angular/material/progress-bar';

interface ClosingsState {
  closings: FinancialClosing[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
}

@Component({
  selector: 'app-financial-closings-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatFormFieldModule, MatDatepickerModule, MatInputModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatTableModule, RouterLink, MatProgressBarModule],
  template: `
    <div class="closings-container">
      @if (authService.isAdmin()) {
        <mat-card class="create-closing-card">
          <mat-card-header>
            <mat-card-title>Novo Fechamento Financeiro</mat-card-title>
            <mat-card-subtitle>Selecione um período para apurar os pagamentos dos colaboradores.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="closingForm" (ngSubmit)="onCreateClosing()">
              <mat-form-field appearance="outline">
                <mat-label>Período do Fechamento</mat-label>
                <mat-date-range-input [formGroup]="closingForm" [rangePicker]="picker">
                  <input matStartDate formControlName="start" placeholder="Data de início">
                  <input matEndDate formControlName="end" placeholder="Data de fim">
                </mat-date-range-input>
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-date-range-picker #picker></mat-date-range-picker>
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" [disabled]="closingForm.invalid || state().isCreating">
                {{ state().isCreating ? 'Gerando...' : 'Gerar Fechamento' }}
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <mat-card class="history-card">
        <mat-card-header>
          <mat-card-title>Histórico de Fechamentos</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (state().isLoading) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          } @else if (state().error) {
            <p class="error-message">{{ state().error }}</p>
          } @else {
            <table mat-table [dataSource]="state().closings">
              <ng-container matColumnDef="period">
                <th mat-header-cell *matHeaderCellDef> Período </th>
                <td mat-cell *matCellDef="let element"> {{ element.start_date | date:'dd/MM/yy' }} - {{ element.end_date | date:'dd/MM/yy' }} </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef> Status </th>
                <td mat-cell *matCellDef="let element"> {{ element.status === 'OPEN' ? 'Aberto' : 'Fechado' }} </td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef> Valor Total Pago </th>
                <td mat-cell *matCellDef="let element"> {{ element.total_paid | currency }} </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef> Ações </th>
                <td mat-cell *matCellDef="let element">
                  <a mat-icon-button [routerLink]="['/financeiro/fechamentos', element.id]" title="Ver Detalhes">
                    <mat-icon>visibility</mat-icon>
                  </a>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['period', 'status', 'total', 'actions']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['period', 'status', 'total', 'actions'];"></tr>
            </table>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./financial-closings.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancialClosingsListComponent implements OnInit {
  protected authService = inject(AuthService);
  private financialService = inject(FinancialService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  state = signal<ClosingsState>({ closings: [], isLoading: true, isCreating: false, error: null });
  closingForm = new FormGroup({
    start: new FormControl<Date | null>(null, Validators.required),
    end: new FormControl<Date | null>(null, Validators.required),
  });

  ngOnInit(): void {
    this.loadClosings();
  }

  loadClosings(): void {
    this.state.update(s => ({ ...s, isLoading: true }));
    this.financialService.getClosings().subscribe({
      next: closings => this.state.update(s => ({ ...s, closings, isLoading: false, error: null })),
      error: () => this.state.update(s => ({ ...s, error: 'Falha ao carregar histórico de fechamentos.', isLoading: false }))
    });
  }

  onCreateClosing(): void {
    if (this.closingForm.invalid) return;
    this.state.update(s => ({ ...s, isCreating: true }));
    const { start, end } = this.closingForm.value;

    this.financialService.createClosing(start!.toISOString(), end!.toISOString()).pipe(
      finalize(() => this.state.update(s => ({ ...s, isCreating: false })))
    ).subscribe({
      next: (newClosing) => {
        this.snackBar.open('Fechamento gerado com sucesso!', 'Fechar', { duration: 3000 });
        this.loadClosings(); // Recarrega a lista
        this.router.navigate(['/financeiro/fechamentos', newClosing.id]); // Navega para os detalhes
      },
      error: (err) => {
        const message = err.error?.detail || 'Não foi possível gerar o fechamento. Verifique se há valores a serem pagos no período.';
        this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
      }
    });
  }
}
