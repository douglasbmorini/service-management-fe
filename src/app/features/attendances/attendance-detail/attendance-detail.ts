import {Component, Inject, inject, OnInit, signal} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {AttendanceForm} from '../../management/components/attendance-form/attendance-form';
import {Attendance, AttendanceCollaborator} from '../../../core/models/attendance.model';
import {TimelineComponent} from '../../../shared/components/timeline/timeline.component';
import {AttendanceService} from '../../../core/services/attendance.service';
import {AuthService} from '../../../core/services/auth.service';
import {MatDivider} from '@angular/material/divider';
import {MatList, MatListItem} from '@angular/material/list';

interface DetailState {
  attendance: Attendance | null;
  isLoading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-attendance-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    TimelineComponent,
    MatDivider,
    MatList,
    MatListItem
  ],
  templateUrl: './attendance-detail.html',
  styleUrls: ['./attendance-detail.scss']
})
export class AttendanceDetail implements OnInit {
  private attendanceService = inject(AttendanceService);
  private dialog = inject(MatDialog);
  protected authService = inject(AuthService);

  state = signal<DetailState>({
    attendance: null,
    isLoading: true,
    error: null
  });

  constructor(
    public dialogRef: MatDialogRef<AttendanceDetail>,
    @Inject(MAT_DIALOG_DATA) public data: { attendanceId: number }
  ) {}

  ngOnInit(): void {
    if (this.data.attendanceId) {
      this.loadAttendanceDetails(this.data.attendanceId);
    } else {
      this.state.set({
        attendance: null,
        isLoading: false,
        error: 'ID do atendimento não fornecido.'
      });
    }
  }

  private loadAttendanceDetails(id: number): void {
    this.state.update(s => ({ ...s, isLoading: true }));
    this.attendanceService.getAttendanceById(id).subscribe({
      next: (attendance: Attendance) => {
        this.state.set({ attendance, isLoading: false, error: null });
      },
      error: (err: any) => {
        console.error(err);
        this.state.set({
          attendance: null,
          isLoading: false,
          error: 'Falha ao carregar os detalhes do atendimento.'
        });
      }
    });
  }

  openEditDialog(): void {
    const attendance = this.state().attendance;
    if (!attendance) return;

    const dialogRef = this.dialog.open(AttendanceForm, {
      width: '600px',
      data: { attendance }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recarrega os detalhes para ver as mudanças
        this.loadAttendanceDetails(attendance.id);
      }
    });
  }

  /**
   * Calculates and returns the financial value for a collaborator based on the attendance billing type.
   * - For FIXED_PRICE, it returns the pre-defined financial value.
   * - For HOURLY, it calculates the value based on hours worked by that specific collaborator.
   * @param collaborator The collaborator for whom to calculate the value.
   * @returns The calculated financial value, or 0 if not applicable.
   */
  getCollaboratorValue(collaborator: AttendanceCollaborator): number {
    const attendance = this.state().attendance;
    if (!attendance) return 0;

    if (attendance.billing_type === 'FIXED_PRICE') {
      return parseFloat(String(collaborator.financial_value || 0));
    }

    if (attendance.billing_type === 'HOURLY') {
      const collaboratorHours = attendance.progress_notes
        .filter(note => note.user.id === collaborator.user_id && note.hours_spent)
        .reduce((sum, note) => sum + parseFloat(String(note.hours_spent)), 0);

      const hourlyRate = parseFloat(String(collaborator.hourly_rate || 0));
      return collaboratorHours * hourlyRate;
    }

    return 0;
  }
}
