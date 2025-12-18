import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {MatCardModule} from '@angular/material/card';
import {MatListModule} from '@angular/material/list';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {finalize} from 'rxjs';
import {FinancialService} from '../../../core/services/financial.service';
import {FinancialClosing} from '../../../core/models/financial.model';
import {AuthService} from '../../../core/services/auth.service';
import {ConfirmationDialogComponent} from '../../management/components/confirmation-dialog.component';
import {MatDialog} from '@angular/material/dialog';

interface DetailState {
  closing: FinancialClosing | null;
  isLoading: boolean;
  isClosing: boolean;
  error: string | null;
}

@Component({
  selector: 'app-financial-closing-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, MatIconModule, MatButtonModule, MatExpansionModule, MatProgressBarModule],
  template: `
    <div class="detail-container">
      @if (state().isLoading) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      } @else if (state().error) {
        <p class="error-message">{{ state().error }}</p>
      } @else if (state().closing; as closing) {
        <header class="detail-header">
          <div>
            <h2>Fechamento: {{ closing.start_date | date:'dd/MM/yy' }} - {{ closing.end_date | date:'dd/MM/yy' }}</h2>
            <p>Status: <strong>{{ closing.status === 'OPEN' ? 'Aberto' : 'Fechado (Pago)' }}</strong></p>
          </div>
          @if (authService.isAdmin() && closing.status === 'OPEN') {
            <button mat-flat-button color="primary" (click)="onClosePeriod(closing.id)" [disabled]="state().isClosing">
              {{ state().isClosing ? 'Fechando...' : 'Marcar como Pago' }}
            </button>
          }
        </header>

        @for (payout of closing.payouts; track payout.collaborator_id) {
          <mat-expansion-panel class="payout-panel">
            <mat-expansion-panel-header>
              <mat-panel-title class="payout-header-title">
                <span>{{ payout.collaborator.full_name }}</span>
                <strong>{{ payout.total_net_value | currency }}</strong>
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="payout-details">
              <div class="detail-section">
                <h4>Atendimentos Finalizados</h4>
                <ul>
                  @for (paidAtt of payout.paid_attendances; track paidAtt.attendance_id) {
                    <li><span>{{ paidAtt.service_description }}</span> <span>{{ paidAtt.net_value | currency }}</span></li>
                  }
                </ul>
              </div>
              @if (payout.applied_user_discounts && payout.applied_user_discounts.length > 0) {
                <div class="detail-section">
                  <h4>Taxas Mensais</h4>
                  <ul>
                    @for (disc of payout.applied_user_discounts; track disc.id) {
                      <li><span>{{ disc.description }}</span> <span class="discount-amount">-{{ disc.amount | currency }}</span></li>
                    }
                  </ul>
                </div>
              }
            </div>
          </mat-expansion-panel>
        }
      }
    </div>
  `,
  styleUrls: ['./financial-closings.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancialClosingDetailComponent implements OnInit {
  protected authService = inject(AuthService);
  private financialService = inject(FinancialService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  state = signal<DetailState>({ closing: null, isLoading: true, isClosing: false, error: null });

  ngOnInit(): void {
    const closingId = this.route.snapshot.paramMap.get('id');
    if (closingId) {
      this.financialService.getClosingById(+closingId).subscribe({
        next: closing => this.state.update(s => ({ ...s, closing, isLoading: false })),
        error: () => this.state.update(s => ({ ...s, error: 'Falha ao carregar detalhes do fechamento.', isLoading: false }))
      });
    }
  }

  onClosePeriod(closingId: number): void {
    this.dialog.open(ConfirmationDialogComponent, { data: { title: 'Confirmar Pagamento', message: 'Esta ação marcará o período como pago e não poderá ser desfeita. Deseja continuar?' } })
      .afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.state.update(s => ({ ...s, isClosing: true }));
          this.financialService.closeClosing(closingId).pipe(
            finalize(() => this.state.update(s => ({ ...s, isClosing: false })))
          ).subscribe({
            next: updatedClosing => {
              this.state.update(s => ({ ...s, closing: updatedClosing }));
              this.snackBar.open('Fechamento marcado como pago!', 'Fechar', { duration: 3000 });
            },
            error: (err) => this.snackBar.open(err.error?.detail || 'Erro ao fechar período.', 'Fechar', { duration: 5000 })
          });
        }
      });
  }
}
