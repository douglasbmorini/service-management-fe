import {Attendance} from "./attendance.model";

export interface ServiceDiscount {
  id: number;
  description: string;
  value: number;
  discount_type: 'PERCENTAGE' | 'FIXED';
  amount: number | string;
  created_at: string;
}

export interface UserDiscount {
  id: number;
  description: string;
  amount: string | number;
  applied_date: string;
}

export type Discount = ServiceDiscount | UserDiscount;

export interface DiscountCreate {
  description: string;
  value: number;
  discount_type: 'PERCENTAGE' | 'FIXED';
}

export interface UserDiscountCreate {
  description: string;
  amount: number;
}

export interface CollaboratorFinancialsEntry {
  attendance_id: number;
  service_description: string;
  status: string;
  financial_value: string | number;
  service_discounts?: ServiceDiscount[];
}

export interface CollaboratorFinancials {
  collaborator_name: string;
  summary: {
    total_net_received: string | number;
    total_to_receive: string | number;
    total_in_progress: string | number;
    total_user_discounts: string | number;
  };
  entries: CollaboratorFinancialsEntry[];
  user_discounts?: UserDiscount[];
}

export interface MonthlyChartData {
  name: string;
  value: number;
}

export interface DetailedEntry extends Attendance {
  type: 'Overdue' | 'Upcoming' | 'Received';
}

export interface FinancialOverview {
  // Lista de atendimentos com pagamentos vencidos e não finalizados
  overdue_attendances: Attendance[];
  // Lista de atendimentos com pagamentos a vencer nos próximos 30 dias
  upcoming_attendances: Attendance[];
  // Lista de atendimentos em execução ou pendentes
  in_progress_attendances: Attendance[];
  // Dados agregados para o gráfico de faturamento mensal
  monthly_invoiced_data: MonthlyChartData[];
}
