import {Component, computed, Input} from '@angular/core';
import {MatCardModule} from "@angular/material/card";
import {CommonModule} from "@angular/common";
import {MatListModule} from "@angular/material/list";
import {
  CollaboratorFinancials,
  CollaboratorFinancialsEntry,
  ServiceDiscount,
} from "../../../core/models/financial.model";
import {AttendanceStatus} from "../../../core/models/attendance.model";
import {MatChipsModule} from "@angular/material/chips";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-collaborator-financials',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, MatChipsModule, MatExpansionModule, MatIconModule],
  templateUrl: './collaborator-financials.component.html',
  styleUrls: ['./collaborator-financials.component.scss']
})
export class CollaboratorFinancialsComponent {
  @Input() financials: CollaboratorFinancials | null = null;

  private statusClassMap: Record<string, string> = {
    [AttendanceStatus.EM_EXECUCAO]: 'status-executing',
    [AttendanceStatus.PENDENTE]: 'status-pending',
    [AttendanceStatus.FATURADA]: 'status-invoiced',
    [AttendanceStatus.FINALIZADA]: 'status-received',
  };

  // Sinal computado para o valor final líquido, que é o mais importante para o colaborador.
  finalNetValue = computed(() => {
    const summary = this.financials?.summary;
    // Garante que os valores sejam tratados como números antes da subtração.
    const totalNetReceived = parseFloat(String(summary?.total_net_received || 0));
    const totalUserDiscounts = parseFloat(String(summary?.total_user_discounts || 0));

    return totalNetReceived - totalUserDiscounts;
  });

  // Helper to calculate the net value for an entry after discounts
  getNetValue(entry: CollaboratorFinancialsEntry): number {
    const grossValue = parseFloat(String(entry.financial_value)) || 0;
    const serviceDiscounts = (entry.service_discounts || []).reduce((sum: number, discount: ServiceDiscount) => sum + (parseFloat(String(discount.amount)) || 0), 0);

    return grossValue - serviceDiscounts;
  }

  getStatusClass(status: string): string {
    return this.statusClassMap[status] || 'status-default';
  }

  getCollaboratorHourlyRate(attendanceId: number): number | null {
    const entry = this.financials?.entries.find(e => e.attendance_id === attendanceId);    // A API agora retorna o hourly_rate diretamente no `CollaboratorFinancialsEntry`.
    // Esta função simplesmente o extrai.
    return entry?.hourly_rate ?? null; 
  }
}
