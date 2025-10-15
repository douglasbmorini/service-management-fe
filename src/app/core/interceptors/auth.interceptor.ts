import {HttpInterceptorFn} from '@angular/common/http';
import {JWT_KEY} from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Lê o token diretamente do localStorage para quebrar a dependência circular com o AuthService.
  const authToken = localStorage.getItem(JWT_KEY);

  // Se o token existir, clona a requisição e adiciona o cabeçalho de autorização
  if (authToken) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
    return next(clonedReq);
  }

  // Se não houver token, passa a requisição original sem modificação
  return next(req);
};
