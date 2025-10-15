export type ClientStatus = 'potencial' | 'ativo' | 'inativo';

export interface Client {
  id: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  finance_contact_name: string;
  finance_contact_email: string;
  finance_contact_phone: string;
  status: ClientStatus;
}

export interface ClientCreate {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

export type ClientUpdate = Partial<Client>;
