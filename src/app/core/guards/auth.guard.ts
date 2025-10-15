import {inject} from '@angular/core';
import {CanActivateFn, Router, UrlTree} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {toObservable} from '@angular/core/rxjs-interop';
import {filter, map, Observable, take} from 'rxjs';

export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  // Se a verificação de auth já terminou, podemos decidir de forma síncrona.
  // Isso otimiza a navegação dentro do app após o carregamento inicial.
  if (authService.isAuthReady()) {
    return authService.isLoggedIn() ? true : router.parseUrl('/login');
  }

  // Se a verificação ainda não terminou (ex: refresh da página),
  // esperamos o signal 'isAuthReady' se tornar true.
  return toObservable(authService.isAuthReady).pipe(
    filter(isReady => isReady), // Espera até que isReady seja true
    take(1), // Pega o primeiro valor 'true' e completa o observable
    map(() => {
      // Agora que a verificação terminou, podemos checar o estado de login com segurança.
      return authService.isLoggedIn() ? true : router.parseUrl('/login');
    })
  );
};
