import {computed, inject, Injectable, signal} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Router} from '@angular/router';
import {catchError, EMPTY, finalize, Observable, switchMap, tap} from 'rxjs';
import {User} from "../models/user.model";
import {environment} from "../../../environments/environment";

const API_URL = environment.apiUrl;
export const JWT_KEY = 'auth_jwt_token'; // Chave para o localStorage

interface AuthState {
  user: User | null;
  jwt: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Signal para gerenciar o estado de autenticação
  public state = signal<AuthState>({
    user: null,
    jwt: null,
  });

  // Signals computados para fácil acesso aos dados do estado
  currentUser = computed(() => this.state().user);
  currentUserRole = computed(() => this.state().user?.role);
  isLoggedIn = computed(() => !!this.state().jwt);
  isAdmin = computed(() => this.state().user?.role === 'admin');
  isManager = computed(() => {
    const role = this.currentUserRole();
    return role === 'admin' || role === 'colaborador';
  });

  // Private writable signal for auth readiness
  private readonly _isAuthReady = signal(false);
  // Public readonly signal to prevent external modification
  public readonly isAuthReady = this._isAuthReady.asReadonly();

  private http = inject(HttpClient);
  private router = inject(Router);

  constructor() {
    this.loadInitialState();
  }

  /**
   * Carrega o token do localStorage e o valida com a API.
   * Notifica a aplicação quando a verificação estiver completa.
   */
  private loadInitialState(): void {
    const token = localStorage.getItem(JWT_KEY);
    if (!token) {
      this._isAuthReady.set(true); // Nenhuma verificação necessária, estamos prontos.
      return;
    }

    this.state.update(s => ({ ...s, jwt: token }));
    this.fetchAndSetUser().pipe(
      catchError((error) => {
        console.error('Falha na validação do token durante o refresh. Deslogando...', error);
        this.logout(); // A API rejeitou o token, então deslogamos.
        return EMPTY;
      }),
      finalize(() => this._isAuthReady.set(true)) // Executa no final, com sucesso ou erro.
    ).subscribe();
  }

  login(credentials: { username: string, password: string }): Observable<User> {
    const body = new HttpParams()
      .set('username', credentials.username)
      .set('password', credentials.password);

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    return this.http.post<{ access_token: string }>(`${API_URL}/login/access-token`, body.toString(), { headers }).pipe(
      tap(tokenResponse => {
        localStorage.setItem(JWT_KEY, tokenResponse.access_token);
        this.state.update(s => ({ ...s, jwt: tokenResponse.access_token }));
      }),
      switchMap(() => this.fetchAndSetUser())
    );
  }

  logout(): void {
    // Limpa o token do localStorage
    localStorage.removeItem(JWT_KEY);
    // Limpa o estado
    this.state.set({ user: null, jwt: null });
    // Redireciona para a página de login
    this.router.navigate(['/login']);
  }

  private fetchAndSetUser(): Observable<User> {
    return this.http.get<User>(`${API_URL}/users/me`).pipe(
      tap(user => {
        // Atualiza o usuário no estado, mantendo o token que já está lá.
        this.state.update(s => ({ ...s, user }));
      })
    );
  }
}
