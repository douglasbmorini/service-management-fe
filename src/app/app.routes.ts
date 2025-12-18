import {Routes} from '@angular/router';
import {LayoutComponent} from './layout/layout.component';
import {authGuard} from './core/guards/auth.guard';
import {managementGuard} from './core/guards/management.guard';

export const routes: Routes = [
  {
    path: 'login',
    // Lazy load do componente de login
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard], // Protege todo o layout e suas rotas filhas
    children: [
      // Lazy load das features principais
      { path: '', loadComponent: () => import('./features/attendances/attendances-list/attendances-list.component').then(m => m.AttendancesListComponent) },
      { path: 'gerencial', loadComponent: () => import('./features/management/management.component').then(m => m.ManagementComponent), canActivate: [managementGuard] },
      { path: 'perfil', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'financeiro', loadComponent: () => import('./features/financial/financial-dashboard/financial-dashboard.component').then(m => m.FinancialDashboardComponent), canActivate: [managementGuard] },
      { path: 'financeiro/fechamentos', loadComponent: () => import('./features/financial/financial-closings/financial-closings-list.component').then(m => m.FinancialClosingsListComponent), canActivate: [managementGuard] },
      { path: 'financeiro/fechamentos/:id', loadComponent: () => import('./features/financial/financial-closings/financial-closing-detail.component').then(m => m.FinancialClosingDetailComponent), canActivate: [managementGuard] },
    ],
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
