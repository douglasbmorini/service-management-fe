import {Component, effect, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {MatDialog} from '@angular/material/dialog';
import {debounceTime, distinctUntilChanged, filter} from "rxjs";
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
import {CollaboratorFinancialsComponent} from '../collaborator-financials/collaborator-financials.component';
import {AttendanceService} from "../../../core/services/attendance.service";
import {CollaboratorFinancials, MonthlyChartData} from '../../../core/models/financial.model';
import {AddUserDiscountFormComponent} from "../add-user-discount-form/add-user-discount-form.component";
import {MatButton, MatIconButton} from '@angular/material/button';
import {Attendance, AttendanceStatus} from '../../../core/models/attendance.model';
import {MatTableModule} from '@angular/material/table';
import {CurrencyPipe, DatePipe, TitleCasePipe} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar} from "@angular/material/snack-bar";
import {AddDiscountFormComponent} from '../add-discount-form/add-discount-form.component';

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
    filteredAttendances: Attendance[]; // Nova propriedade para a tabela reativa
    isLoading: boolean;
    error: string | null;
    receivedInPeriod: number;
    overduePayments: number;
    upcomingReceivables: number;
    inProgressValue: number;
    monthlyChartData: MonthlyChartData[];
}

type DateRange = { start: Date | null, end: Date | null };

@Component({
    selector: 'app-financial-dashboard',
    standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, FinancialOverviewComponent, CollaboratorFinancialsComponent, MatButton, MatTableModule, TitleCasePipe, MatIconModule, DatePipe, CurrencyPipe, MatIconButton],
    templateUrl: './financial-dashboard.component.html',
    styleUrls: ['./financial-dashboard.component.scss']
})
export class FinancialDashboardComponent implements OnInit {
    private financialService = inject(FinancialService);
    private attendanceService = inject(AttendanceService);
    protected authService = inject(AuthService);
    private userService = inject(UserService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    private readonly today = new Date();
    private readonly firstDayOfMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);

    state = signal<FinancialState>({
        collaboratorFinancials: null,
        collaborators: [],
        filteredAttendances: [],
        isLoading: true,
        error: null,
        receivedInPeriod: 0,
        overduePayments: 0,
        upcomingReceivables: 0,
        inProgressValue: 0,
        monthlyChartData: []
    });

    // O FormGroup para o filtro de data
    rangeForm = new FormGroup({
        start: new FormControl<Date | null>(this.firstDayOfMonth),
        end: new FormControl<Date | null>(this.today),
    });

    // Filtros como signals separados
    selectedCollaboratorId = signal<number | null>(null);
    selectedStatus = signal<string | null>(null); // Novo filtro de status
    dateRange = signal<DateRange>({
      start: this.firstDayOfMonth,
      end: this.today
    });

    allStatuses = [
      AttendanceStatus.EM_EXECUCAO,
      AttendanceStatus.PENDENTE,
      AttendanceStatus.FATURADA,
      AttendanceStatus.FINALIZADA
    ];
    displayedColumns: string[] = ['client', 'description', 'status', 'due_date', 'value', 'actions'];

    constructor() {
      // Conecta o formulário de data ao signal de forma reativa e segura
      this.rangeForm.valueChanges.pipe(
        debounceTime(400),
        filter((value): value is { start: Date, end: Date } => !!value.start && !!value.end),
        filter(value => value.start.getTime() <= value.end.getTime()),
        distinctUntilChanged((prev, curr) =>
          prev.start.getTime() === curr.start.getTime() && prev.end.getTime() === curr.end.getTime()
        )
      ).subscribe(value => this.dateRange.set(value));

      // Efeito que reage a qualquer mudança nos filtros e recarrega os dados.
      // Deve ser chamado no construtor para ter acesso ao contexto de injeção.
      effect(() => {
        const selectedId = this.selectedCollaboratorId(); // Lê o signal do filtro
        const range = this.dateRange(); // Lê o signal do filtro
        const status = this.selectedStatus(); // Lê o novo signal de status

        if (range.start && range.end) {
          this.reloadDataForCurrentView(selectedId, formatDate(range.start), formatDate(range.end), status);
        }
      });
    }

    ngOnInit(): void {
        this.loadInitialCollaborators();

        // Atualiza o estado do colaborador quando o usuário logado não é admin.
        const currentUser = this.authService.currentUser();
        if (!this.authService.isAdmin() && currentUser) {
            this.selectedCollaboratorId.set(currentUser.id);
        }

        // Inicia o carregamento de dados com os valores iniciais dos filtros.
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
    const { start, end } = this.dateRange();
    if (start && end) {
      this.reloadDataForCurrentView(this.selectedCollaboratorId(), formatDate(start), formatDate(end), this.selectedStatus());
    }
  }

  openAddUserDiscountDialog(): void {
    const selectedCollaboratorId = this.selectedCollaboratorId();
    // Busca o colaborador na lista de colaboradores carregada
    const collaborators = this.state().collaborators;
    const selectedCollaborator = collaborators.find(c => c.id === selectedCollaboratorId);

    if (!selectedCollaborator) return;

    const dialogRef = this.dialog.open(AddUserDiscountFormComponent, {
      width: '500px',
      data: { // Passa os dados necessários para o dialog
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

  openAddDiscountDialog(attendance: Attendance): void {
    const dialogRef = this.dialog.open(AddDiscountFormComponent, {
      width: '500px',
      data: {
        attendanceId: attendance.id,
        serviceDescription: attendance.service_description,
        billingType: attendance.billing_type
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Quando um desconto é adicionado, recarregamos todos os dados financeiros,
        // pois isso pode afetar os cards de resumo (ex: Valor em Andamento).
        this.loadFinancialData();
      }
    });
  }

  /**
   * Decide qual conjunto de dados carregar com base na visão atual (geral ou por colaborador).
   */
  private reloadDataForCurrentView(selectedCollaboratorId: number | null, startDate: string, endDate: string, status: string | null): void {
    if (selectedCollaboratorId) {
      this.loadCollaboratorData(selectedCollaboratorId, startDate, endDate);
    } else {
      // Esta branch só é executada se for admin na visão geral.
      this.loadGeneralOverviewData(startDate, endDate);
      this.loadFilteredAttendances(startDate, endDate, status);
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
          monthlyChartData: overview.monthly_invoiced_data,
          isLoading: false
        }));
      },
      error: () => this.state.update(s => ({...s, error: 'Falha ao carregar dados financeiros.', isLoading: false}))
    });
  }

  private loadFilteredAttendances(startDate: string, endDate: string, status: string | null): void {
    // Não precisa setar isLoading aqui, pois a chamada principal já faz isso.
    const filters = {
      start_date: startDate,
      end_date: endDate,
      status: status,
      collaboratorId: null // Na visão geral, não filtramos por colaborador aqui
    };

    this.attendanceService.getAttendances(filters).subscribe({
      next: (attendances) => {
        this.state.update(s => ({ ...s, filteredAttendances: attendances }));
      },
      error: () => {
        // Atualiza apenas a parte de atendimentos da tabela em caso de erro
        this.state.update(s => ({ ...s, filteredAttendances: [] }));
        this.snackBar.open('Falha ao carregar a lista detalhada de atendimentos.', 'Fechar', { duration: 4000 });
      }
    });
  }

  getEntryValue(entry: Attendance): number {
    if (entry.billing_type === 'HOURLY') {
      return entry.collaborators.reduce((total, collaborator) => {
        const collaboratorHours = entry.progress_notes
          .filter(note => note.user.id === collaborator.user_id && note.hours_spent)
          .reduce((sum, note) => sum + parseFloat(String(note.hours_spent)), 0);
        const hourlyRate = parseFloat(String(collaborator.hourly_rate || 0));
        return total + (collaboratorHours * hourlyRate);
      }, 0);
    }
    return entry.total_proposal_value || 0;
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
