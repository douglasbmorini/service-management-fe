import {Component, computed, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Attendance, AttendanceStatus} from '../../../core/models/attendance.model';
import {MatCardModule} from "@angular/material/card";
import {MatChipsModule} from "@angular/material/chips";
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-attendance-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './attendance-card.html',
  styleUrl: './attendance-card.scss'
})
export class AttendanceCard {
  @Input({ required: true }) attendance!: Attendance;
  @Output() cardClicked = new EventEmitter<number>();

  // Mapeamento de status para classes CSS para manter o template limpo
  private statusClassMap: Record<string, string> = {
    [AttendanceStatus.PROPOSTA_ENVIADA]: 'status-proposal',
    [AttendanceStatus.PROPOSTA_ACEITA]: 'status-executing',
    [AttendanceStatus.PROPOSTA_RECUSADA]: 'status-default',
    [AttendanceStatus.EM_EXECUCAO]: 'status-executing',
    [AttendanceStatus.PENDENTE]: 'status-pending',
    [AttendanceStatus.FATURADA]: 'status-invoiced',
    [AttendanceStatus.FINALIZADA]: 'status-finished',
  };

  statusClass = computed(() => this.statusClassMap[this.attendance.status] || 'status-default');

  remainingHours = computed(() => (this.attendance.total_hours ?? 0) - (this.attendance.hours_worked ?? 0));

  onClick(): void {
    this.cardClicked.emit(this.attendance.id);
  }
}
