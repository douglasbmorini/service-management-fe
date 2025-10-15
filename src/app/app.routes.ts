import {Routes} from '@angular/router';
import {LayoutComponent} from './layout/layout.component';
import {authGuard} from './core/guards/auth.guard';
import {managementGuard} from './core/guards/management.guard';

export const routes: Routes = [
  {
    path: 'login',
    // Lazy load do componente de login
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard], // Protege todo o layout e suas rotas filhas
    children: [
      // Lazy load das features principais
      { path: '', loadComponent: () => import('./features/attendances/attendances-list/attendances-list').then(m => m.AttendancesListComponent) },
      { path: 'gerencial', loadComponent: () => import('./features/management/management').then(m => m.Management), canActivate: [managementGuard] },
      { path: 'perfil', loadComponent: () => import('./features/profile/profile').then(m => m.Profile) },
      { path: 'financeiro', loadComponent: () => import('./features/financial/financial-dashboard/financial-dashboard.component').then(m => m.FinancialDashboardComponent), canActivate: [managementGuard] },
    ],
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
