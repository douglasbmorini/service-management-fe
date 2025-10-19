import {Component, effect, inject, OnInit, signal} from '@angular/core';
import {Attendance, AttendanceStatus} from '../../../core/models/attendance.model';
import {AttendanceService} from '../../../core/services/attendance.service';
import {MatDialog} from "@angular/material/dialog";
import {TimelineComponent} from '../../../shared/components/timeline/timeline.component';
import {UserService} from '../../../core/services/user.service';
import {User} from '../../../core/models/user.model';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AttendanceCard} from '../attendance-card/attendance-card';
import {AttendanceDetail} from '../attendance-detail/attendance-detail';
import {AuthService} from '../../../core/services/auth.service';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from "@angular/material/card";
import {TitleCasePipe} from "@angular/common";
import {debounceTime, distinctUntilChanged, filter, map} from "rxjs";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatInputModule} from "@angular/material/input";
import {MatTooltip} from '@angular/material/tooltip';

// Helper function to format date to 'YYYY-MM-DD'
const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


interface AttendancesState {
  attendances: Attendance[];
  collaborators: User[];
  isLoading: boolean;
  error: string | null;
  viewMode: 'cards' | 'timeline';
}

@Component({
  selector: 'app-attendances-list',
  standalone: true,
  imports: [
    AttendanceCard,
    TimelineComponent,
    FormsModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    MatIconModule,
    TitleCasePipe,
    MatCardModule,
    MatDatepickerModule,
    MatInputModule,
    ReactiveFormsModule,
    MatTooltip
  ],
  templateUrl: './attendances-list.html',
  styleUrls: ['./attendances-list.scss']
})
export class AttendancesListComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  protected authService = inject(AuthService);

  // Define start and end dates for the current month
  private readonly firstDayOfMonth: Date;
  private readonly lastDayOfMonth: Date;

  // Estado reativo com Signal
  state = signal<AttendancesState>({
    attendances: [],
    collaborators: [],
    isLoading: true,
    error: null,
    viewMode: 'cards',
  });

  // FormGroup for date range picker
  range: FormGroup;

  // Signals for individual filters
  selectedStatus = signal<string | null>(null);
  selectedCollaboratorId = signal<number | null>(null);

  // Signal para o range de datas, que será a fonte da verdade
  private dateRange = signal<{ start: Date | null, end: Date | null }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });

  allStatuses = Object.values(AttendanceStatus);

  constructor() {
    const today = new Date();
    this.firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.dateRange.set({ start: this.firstDayOfMonth, end: this.lastDayOfMonth });

    this.range = new FormGroup({
      start: new FormControl<Date | null>(this.firstDayOfMonth),
      end: new FormControl<Date | null>(this.lastDayOfMonth),
    });

    // Conecta o formulário ao signal
    this.range.valueChanges.pipe(
      // Aguarda um pequeno tempo após a digitação para não sobrecarregar
      debounceTime(400),
      // Garante que ambas as datas não são nulas
      filter((value): value is { start: Date, end: Date } => !!value.start && !!value.end),
      // Garante que a data de início seja anterior ou igual à data de fim
      filter(value => value.start.getTime() <= value.end.getTime()),
      // Só emite se o valor realmente mudou
      distinctUntilChanged((prev, curr) => prev.start.getTime() === curr.start.getTime() && prev.end.getTime() === curr.end.getTime())
    ).subscribe(value => this.dateRange.set(value));

    // Effect to automatically reload data when any filter changes
    // Deve ser chamado no construtor para ter acesso ao contexto de injeção.
    effect(() => {
      const filters = {
        start_date: this.dateRange().start ? formatDate(this.dateRange().start!) : null,
        end_date: this.dateRange().end ? formatDate(this.dateRange().end!) : null,
        status: this.selectedStatus(),
        collaboratorId: this.selectedCollaboratorId(),
      };
      this.loadAttendances(filters);
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    if (this.authService.isAdmin()) {
      this.userService.getUsers().pipe(
        map(users => users.filter(user => user.role === 'colaborador' && user.is_active)),
        // Set the initial collaborator filter value based on the current user if not admin
        // This part is now handled by the initial signal value if needed
      ).subscribe({
        next: (collaborators) => this.state.update(s => ({ ...s, collaborators })),
        error: (err) => console.error('Falha ao carregar colaboradores.', err)
      });
    }
  }

  private loadAttendances(filters: { start_date: string | null, end_date: string | null, collaboratorId: number | null, status: string | null }): void {
    this.state.update(s => ({ ...s, isLoading: true }));
    this.attendanceService.getAttendances(filters).subscribe({
      next: (data) => this.state.update(s => ({ ...s, attendances: data, isLoading: false, error: null })),
      error: (err) => this.state.update(s => ({ ...s, error: 'Falha ao carregar atendimentos.', isLoading: false, attendances: [] })),
    });
  }

  onCardClicked(attendanceId: number): void {
    this.dialog.open(AttendanceDetail, {
      width: '800px',
      maxWidth: '90vw',
      autoFocus: false,
      data: { attendanceId },
      panelClass: 'theme-dialog-container'
    });
  }

  setViewMode(mode: 'cards' | 'timeline'): void {
    this.state.update(s => ({ ...s, viewMode: mode }));
  }
}
