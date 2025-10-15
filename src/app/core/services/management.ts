import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

const API_URL = 'http://localhost:8000/api/v1';

@Injectable({
  providedIn: 'root'
})
export class ManagementService {
  private http = inject(HttpClient);
  // Métodos para adicionar colaboradores, aceitar propostas, etc., virão aqui.
}
