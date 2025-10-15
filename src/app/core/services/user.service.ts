import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {User, UserCreateByAdmin, UserUpdate} from '../models/user.model';
import {environment} from "../../../environments/environment";

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);

  // Renomeado para maior clareza, já que para admin retorna todos os usuários.
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_URL}/users/`);
  }

  createUser(user: UserCreateByAdmin): Observable<User> {
    return this.http.post<User>(`${API_URL}/users/`, user);
  }

  updateUser(id: number, user: UserUpdate): Observable<User> {
    return this.http.put<User>(`${API_URL}/users/${id}`, user);
  }

  deleteUser(id: number): Observable<any> {
    // A API retorna o usuário deletado, mas podemos usar 'any' para simplicidade
    return this.http.delete<any>(`${API_URL}/users/${id}`);
  }

  // Novo método para o usuário logado atualizar seu próprio perfil
  updateCurrentUser(data: UserUpdate & { password?: string }): Observable<User> {
    return this.http.put<User>(`${API_URL}/users/me`, data);
  }
}
