export type UserRole = 'admin' | 'colaborador' | 'cliente';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number?: string;
  is_active: boolean;
  role: UserRole;
}

// Interface para criar um usuário via painel de admin
export interface UserCreateByAdmin {
  email: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
}

export type UserUpdate = Partial<UserCreateByAdmin> & { is_active?: boolean; };
