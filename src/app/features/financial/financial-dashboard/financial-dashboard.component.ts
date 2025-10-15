import {Component, effect, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {MatDialog} from '@angular/material/dialog';
import {MatCardModule} from "@angular/material/card";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatProgressBarModule} from "@angular/material/progress-bar";

import {FinancialService} from "../../../core/services/financial.service";
import {AuthService} from "../../../core/services/auth.service";
import {UserService} from "../../../core/services/user.service";
import {User} from "../../../core/models/user.model";
import {FinancialOverviewComponent} from "../financial-overview/financial-overview.component";
import {CollaboratorFinancialsComponent} from "../collaborator-financials/collaborator-financials.component";
import {AttendanceService} from "../../../core/services/attendance.service";
import {CollaboratorFinancials, DetailedEntry, MonthlyChartData} from "../../../core/models/financial.model";
import {AddUserDiscountFormComponent} from "../add-user-discount-form/add-user-discount-form.component";
import {MatButton} from '@angular/material/button';

// Helper function to format date to 'YYYY-MM-DD'
const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface FinancialState {
    collaboratorFinancials: CollaboratorFinancials | null;
    collaborators: User[];
    isLoading: boolean;
    error: string | null;
    selectedCollaboratorId: number | null;
    // Enhanced metrics
    receivedInPeriod: number;
    overduePayments: number;
    upcomingReceivables: number;
    inProgressValue: number;
    monthlyChartData: MonthlyChartData[];
    detailedEntries: DetailedEntry[];
}

@Component({
    selector: 'app-financial-dashboard',
    standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, FinancialOverviewComponent, CollaboratorFinancialsComponent, MatButton],
    templateUrl: './financial-dashboard.component.html',
    styleUrls: ['./financial-dashboard.component.scss']
})
export class FinancialDashboardComponent implements OnInit {
    private financialService = inject(FinancialService);
    private attendanceService = inject(AttendanceService);
    protected authService = inject(AuthService);
    private userService = inject(UserService);
    private dialog = inject(MatDialog);

    private readonly today = new Date();
    private readonly firstDayOfMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);

    state = signal<FinancialState>({
        collaboratorFinancials: null,
        collaborators: [],
        isLoading: true,
        error: null,
        selectedCollaboratorId: null,
        receivedInPeriod: 0,
        overduePayments: 0,
        upcomingReceivables: 0,
        inProgressValue: 0,
        monthlyChartData: [],
        detailedEntries: []
    });

    range = new FormGroup({
        start: new FormControl<Date | null>(this.firstDayOfMonth),
        end: new FormControl<Date | null>(this.today),
    });

    ngOnInit(): void {
        this.loadInitialCollaborators();

        // Efeito que reage a qualquer mudança nos filtros e recarrega os dados.
        effect(() => {
            const selectedId = this.state().selectedCollaboratorId;
            const dateRange = this.range.value;

            if (dateRange.start && dateRange.end) {
                this.reloadDataForCurrentView(formatDate(dateRange.start), formatDate(dateRange.end));
            }
        }, { allowSignalWrites: true }); // Necessário porque o carregamento de dados atualiza o estado (sinal).

        // Atualiza o estado do colaborador quando o usuário logado não é admin.
        const currentUser = this.authService.currentUser();
        if (!this.authService.isAdmin() && currentUser) {
            this.state.update(s => ({ ...s, selectedCollaboratorId: currentUser.id }));
        }

        // Inicia o carregamento de dados com os valores iniciais dos filtros.
        const { start, end } = this.range.value;
        if (start && end) {
            this.reloadDataForCurrentView(formatDate(start), formatDate(end));
        }
    }

    private loadInitialCollaborators(): void {
    const currentUser = this.authService.currentUser();
    if (this.authService.isAdmin()) {
      this.userService.getUsers().subscribe(users => {
        const collaborators = users.filter(u => u.role === 'colaborador' && u.is_active);
        this.state.update(s => ({ ...s, collaborators }));
      });
    }
    }

  /**
   * Public method to be called from the template when data changes (e.g., a discount is added).
   * It re-triggers the data loading process with the current filters.
   */
  loadFinancialData(): void {
    const { start, end } = this.range.value;
    if (start && end) {
      this.reloadDataForCurrentView(formatDate(start), formatDate(end));
    }
  }

  openAddUserDiscountDialog(): void {
    const selectedCollaboratorId = this.state().selectedCollaboratorId;
    const selectedCollaborator = this.state().collaborators.find(c => c.id === selectedCollaboratorId);

    if (!selectedCollaborator) return;

    const dialogRef = this.dialog.open(AddUserDiscountFormComponent, {
      width: '500px',
      data: {
        userId: selectedCollaborator.id,
        userName: selectedCollaborator.full_name
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadFinancialData();
      }
    });
  }

  /**
   * Decide qual conjunto de dados carregar com base na visão atual (geral ou por colaborador).
   */
  private reloadDataForCurrentView(startDate: string, endDate: string): void {
    const selectedCollaboratorId = this.state().selectedCollaboratorId;
    if (selectedCollaboratorId) {
      this.loadCollaboratorData(selectedCollaboratorId, startDate, endDate);
    } else {
      // Esta branch só é executada se for admin na visão geral.
      this.loadGeneralOverviewData(startDate, endDate);
    }
  }

  private loadGeneralOverviewData(startDate: string, endDate: string): void {
    this.state.update(s => ({...s, isLoading: true, error: null, collaboratorFinancials: null}));

    // A single call to the backend endpoint that should provide all necessary aggregated data.
    this.financialService.getFinancialOverview(startDate, endDate).subscribe({
      next: (overview: any) => {
        // O backend agora pré-calcula os totais e consolida as entradas.
        // O frontend apenas exibe os dados recebidos.
        this.state.update(s => ({
          ...s,
          receivedInPeriod: parseFloat(overview.totals.received_in_period) || 0,
          overduePayments: parseFloat(overview.totals.overdue_payments) || 0,
          upcomingReceivables: parseFloat(overview.totals.upcoming_receivables) || 0,
          inProgressValue: parseFloat(overview.totals.in_progress_value) || 0,
          detailedEntries: overview.detailed_entries || [],
          monthlyChartData: overview.monthly_invoiced_data,
          isLoading: false
        }));
      },
      error: () => this.state.update(s => ({...s, error: 'Falha ao carregar dados financeiros.', isLoading: false}))
    });
  }

    onCollaboratorChange(collaboratorId: number | null): void {
    this.state.update(s => ({ ...s, selectedCollaboratorId: collaboratorId }));
    const { start, end } = this.range.value;
    if (start && end) {
      this.reloadDataForCurrentView(formatDate(start), formatDate(end));
    }
    }

    private loadCollaboratorData(userId: number, startDate: string, endDate: string): void {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));
        this.financialService.getCollaboratorFinancials(userId, startDate, endDate).subscribe({
            next: financials => {
                this.state.update(s => ({ ...s, collaboratorFinancials: financials, isLoading: false }));
            },
            error: err => {
        this.state.update(s => ({ ...s, error: 'Falha ao carregar dados do colaborador.', isLoading: false }));
            }
        });
    }
}
