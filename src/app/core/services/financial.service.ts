import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from "../../../environments/environment";
import {CollaboratorFinancials, DiscountCreate, FinancialOverview, UserDiscountCreate} from "../models/financial.model";

const API_URL = `${environment.apiUrl}/financial`;

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  private http = inject(HttpClient);

  getFinancialOverview(startDate?: string, endDate?: string): Observable<FinancialOverview> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    return this.http.get<FinancialOverview>(`${API_URL}/overview`, { params });
  }

  getCollaboratorFinancials(userId: number, startDate?: string, endDate?: string): Observable<CollaboratorFinancials> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }
    return this.http.get<CollaboratorFinancials>(`${API_URL}/collaborator/${userId}`, { params });
  }

  addDiscount(attendanceId: number, data: DiscountCreate[]): Observable<any> {
    return this.http.post(`${API_URL}/service-discounts/${attendanceId}`, data);
  }

  addUserDiscount(userId: number, data: UserDiscountCreate[]): Observable<any> {
    return this.http.post(`${API_URL}/user-discounts/${userId}`, data);
  }
}
