import {Client} from './client.model';
import {User} from './user.model';
import {ServiceDiscount} from './financial.model';

export enum AttendanceStatus {
  PROPOSTA_CRIADA = 'PROPOSTA_CRIADA',
  PROPOSTA_ENVIADA = 'PROPOSTA_ENVIADA',
  PROPOSTA_ACEITA = 'PROPOSTA_ACEITA',
  PROPOSTA_RECUSADA = 'PROPOSTA_RECUSADA',
  EM_EXECUCAO = 'EM_EXECUCAO',
  PENDENTE = 'PENDENTE',
  FATURADA = 'FATURADA',
  FINALIZADA = 'FINALIZADA',
}

export enum BillingType {
  FIXED_PRICE = 'FIXED_PRICE',
  HOURLY = 'HOURLY',
}

export interface AttendanceCollaborator {
  id: number;
  attendance_id: number;
  user_id: number;
  financial_value?: number | null; // Pode ser nulo para projetos HOURLY
  hourly_rate?: number | null; // Novo campo para valor/hora
  user: User;
}

export interface ProgressNote {
  id: number;
  hours_spent: number;
  note: string;
  created_at: string;
  user: User;
}

export interface BlockerNote {
  id: number;
  note: string;
  created_at: string;
  is_resolved: boolean;
  resolved_at?: string | null;
  user: User; // Quem criou
  resolved_by_user?: User | null; // Quem resolveu
}

export type AttendanceCollaboratorFixed = { user_id: number; financial_value: number; };
export type AttendanceCollaboratorHourly = { user_id: number; hourly_rate: number; };

export type AttendanceCollaboratorPayload = AttendanceCollaboratorFixed | AttendanceCollaboratorHourly;

export interface Attendance {
  id: number;
  client_id: number;
  service_description: string;
  total_proposal_value?: number;
  total_amount?: number; // Valor total calculado (fixo ou horas)
  total_discounts_amount?: number; // Total de descontos
  status: AttendanceStatus;
  billing_type: BillingType;
  total_hours?: number;
  hours_worked?: number;
  due_date?: string;
  invoice_link?: string;
  payment_receipt_link?: string;
  contract_link?: string;
  created_at: string;
  updated_at: string;
  client: Client;
  service_discounts: ServiceDiscount[];
  collaborators: AttendanceCollaborator[];
  progress_notes: ProgressNote[];
  blocker_notes: BlockerNote[];
}

export interface AttendanceCreate {
  client_id: number;
  service_description: string;
  billing_type: BillingType;
  total_hours?: number;
  due_date?: string;
  contract_link?: string;
}

export interface AttendanceFilters {
  start_date?: string | null;
  end_date?: string | null;
  collaboratorId?: number | null;
  status?: string | null;
  ids?: number[];
}

export type AttendanceUpdate = Partial<Omit<Attendance, 'id' | 'client_id' | 'client' | 'collaborators' | 'created_at' | 'updated_at'>>;

export interface AttendanceStartExecution {
  collaborators: AttendanceCollaboratorPayload[];
}

export interface AttendanceAcceptProposal {
  total_proposal_value?: number | null;
  due_date: string;
  total_hours?: number;
  contract_link: string;
}
