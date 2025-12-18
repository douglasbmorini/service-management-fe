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
  attendance_id?: number;
  description: string;
  value: number;
  discount_type: 'PERCENTAGE' | 'FIXED';
  applied_date: string;
}

export interface UserDiscountCreate {
  description: string;
  amount: number;
  applied_date: string;
}

export interface CollaboratorFinancialsEntry {
  attendance_id: number;
  billing_type: 'FIXED_PRICE' | 'HOURLY';
  service_description: string;
  status: string;
  financial_value: string | number;
  hourly_rate?: number | null; // Adicionado para projetos HOURLY
  service_discounts?: ServiceDiscount[];
  total_discounts_amount?: number; // Pré-calculado pelo backend
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
}

// --- Novas Entidades para Fechamento Financeiro ---

export interface CollaboratorPayout {
  collaborator_id: number;
  collaborator: { full_name: string }; // Objeto aninhado com o nome
  total_gross_value: number;
  total_service_discounts: number;
  total_user_discounts: number;
  total_net_value: number;
  // A API agora envia o objeto completo com a descrição
  paid_attendances: { attendance_id: number; service_description: string; net_value: number; }[];
  applied_user_discounts: UserDiscount[];
}

export interface FinancialClosing {
  id: number;
  start_date: string;
  end_date: string;
  status: 'OPEN' | 'CLOSED';
  total_paid: number; // Agora obrigatório, vindo da listagem
  // A lista de atendimentos não vem no payload principal, será buscada separadamente.
  payouts: CollaboratorPayout[];
}
