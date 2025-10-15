import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {
  Attendance,
  AttendanceAcceptProposal,
  AttendanceCreate,
  AttendanceFilters,
  AttendanceStartExecution,
  AttendanceUpdate
} from '../models/attendance.model';
import {environment} from "../../../environments/environment";

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private http = inject(HttpClient);

  getAttendances(filters: AttendanceFilters = {}): Observable<Attendance[]> {
    let params = new HttpParams();
    if (filters.start_date) {
      params = params.set('start_date', filters.start_date);
    }
    if (filters.end_date) {
      params = params.set('end_date', filters.end_date);
    }
    if (filters.collaboratorId) {
      params = params.set('collaborator_id', filters.collaboratorId.toString());
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    return this.http.get<Attendance[]>(`${API_URL}/attendances/`, { params });
  }

  getAttendanceById(id: number): Observable<Attendance> {
    return this.http.get<Attendance>(`${API_URL}/attendances/${id}`);
  }

  createAttendance(data: AttendanceCreate): Observable<Attendance> {
    return this.http.post<Attendance>(`${API_URL}/attendances/`, data);
  }

  updateAttendance(id: number, data: AttendanceUpdate): Observable<Attendance> {
    return this.http.put<Attendance>(`${API_URL}/attendances/${id}`, data);
  }

  // Métodos para transições de status
  sendProposal(id: number): Observable<Attendance> {
    return this.http.put<Attendance>(`${API_URL}/attendances/${id}/send-proposal`, {});
  }

  acceptProposal(id: number, data: AttendanceAcceptProposal): Observable<Attendance> {
    return this.http.put<Attendance>(`${API_URL}/attendances/${id}/accept-proposal`, data);
  }

  refuseProposal(id: number): Observable<Attendance> {
    return this.http.put<Attendance>(`${API_URL}/attendances/${id}/refuse-proposal`, {});
  }

  startExecution(id: number, data: AttendanceStartExecution): Observable<Attendance> {
    return this.http.post<Attendance>(`${API_URL}/attendances/${id}/start-execution`, data);
  }

  addProgressNote(attendanceId: number, data: { note: string; hours_spent?: number }): Observable<any> {
    return this.http.post(`${API_URL}/attendances/${attendanceId}/progress-notes`, data);
  }

  addBlockerNote(attendanceId: number, note: string): Observable<any> {
    return this.http.post(`${API_URL}/attendances/${attendanceId}/blocker-notes`, { note });
  }

  resolveBlockerNote(attendanceId: number, noteId: number): Observable<any> {
    return this.http.put(`${API_URL}/attendances/${attendanceId}/blocker-notes/${noteId}/resolve`, {});
  }
}
