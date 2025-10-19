import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ManagementService {
  private http = inject(HttpClient);
  // Métodos para adicionar colaboradores, aceitar propostas, etc., virão aqui.
}
