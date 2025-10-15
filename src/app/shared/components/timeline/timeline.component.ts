import {Component, computed, Input} from '@angular/core';
import {NgClass, TitleCasePipe} from '@angular/common';
import {AttendanceStatus} from '../../../core/models/attendance.model';
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [NgClass, MatIconModule, TitleCasePipe],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
})
export class TimelineComponent {
  @Input({ required: true }) currentStatus!: AttendanceStatus;

  // A ordem do "caminho feliz"
  private readonly happyPathOrder: AttendanceStatus[] = [
    AttendanceStatus.PROPOSTA_CRIADA,
    AttendanceStatus.PROPOSTA_ENVIADA,
    AttendanceStatus.PROPOSTA_ACEITA,
    AttendanceStatus.EM_EXECUCAO,
    AttendanceStatus.FATURADA,
    AttendanceStatus.FINALIZADA,
  ];

  // Mapeia cada status para um ícone do Material Icons
  private readonly statusIcons: Record<AttendanceStatus, string> = {
    [AttendanceStatus.PROPOSTA_CRIADA]: 'add_circle_outline',
    [AttendanceStatus.PROPOSTA_ENVIADA]: 'send',
    [AttendanceStatus.PROPOSTA_ACEITA]: 'thumb_up',
    [AttendanceStatus.EM_EXECUCAO]: 'engineering',
    [AttendanceStatus.PENDENTE]: 'hourglass_empty',
    [AttendanceStatus.FATURADA]: 'receipt_long',
    [AttendanceStatus.FINALIZADA]: 'check_circle',
    [AttendanceStatus.PROPOSTA_RECUSADA]: 'thumb_down',
  };

  private determineStatusOrder(): AttendanceStatus[] {
    const statusOrder = [...this.happyPathOrder];

    // Lida com os casos especiais que alteram o fluxo da timeline
    if (this.currentStatus === AttendanceStatus.PENDENTE) {
      const execIndex = statusOrder.indexOf(AttendanceStatus.EM_EXECUCAO);
      statusOrder.splice(execIndex + 1, 0, AttendanceStatus.PENDENTE);
    } else if (this.currentStatus === AttendanceStatus.PROPOSTA_RECUSADA) {
      const sentIndex = statusOrder.indexOf(AttendanceStatus.PROPOSTA_ENVIADA);
      return [...statusOrder.slice(0, sentIndex + 1), AttendanceStatus.PROPOSTA_RECUSADA];
    }

    return statusOrder;
  }

  timelineSteps = computed(() => {
    const statusOrder = this.determineStatusOrder();
    const currentStatusIndex = statusOrder.indexOf(this.currentStatus);

    return statusOrder.map((status, index) => {
      let state: 'completed' | 'current' | 'pending' | 'error' = 'pending';
      if (index < currentStatusIndex) {
        state = 'completed';
      } else if (index === currentStatusIndex) {
        state = 'current';
      }

      // Sobrescreve o estado para o caso de recusa
      if (status === AttendanceStatus.PROPOSTA_RECUSADA && this.currentStatus === AttendanceStatus.PROPOSTA_RECUSADA) {
        state = 'error';
      }

      return {
        status,
        state,
        icon: this.statusIcons[status] || 'help_outline',
        label: status.replace(/_/g, ' ')
      };
    });
  });
}
