import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from '../services/auth.service';

const DEFAULT_REDIRECT_URL = '/';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Redireciona para a home se o usuário não for admin
  return authService.isAdmin() ? true : router.createUrlTree([DEFAULT_REDIRECT_URL]);
};
