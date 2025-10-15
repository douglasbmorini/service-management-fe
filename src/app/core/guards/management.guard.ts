import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from '../services/auth.service';

const DEFAULT_REDIRECT_URL = '/';

export const managementGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Redireciona para a home se o usuário não for admin ou colaborador
  return authService.isManager() ? true : router.createUrlTree([DEFAULT_REDIRECT_URL]);
};
