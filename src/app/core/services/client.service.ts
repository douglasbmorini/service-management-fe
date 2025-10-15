import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Client, ClientCreate, ClientUpdate} from '../models/client.model';
import {environment} from "../../../environments/environment";

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private http = inject(HttpClient);

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(`${API_URL}/clients/`);
  }

  createClient(client: ClientCreate): Observable<Client> {
    return this.http.post<Client>(`${API_URL}/clients/`, client);
  }

  updateClient(id: number, client: ClientUpdate): Observable<Client> {
    return this.http.put<Client>(`${API_URL}/clients/${id}`, client);
  }

  deleteClient(id: number): Observable<any> {
    // A API retorna o cliente deletado, mas podemos usar 'any' para simplicidade
    return this.http.delete<any>(`${API_URL}/clients/${id}`);
  }
}
