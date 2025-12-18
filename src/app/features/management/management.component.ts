import {ChangeDetectionStrategy, Component, inject, OnInit, signal, WritableSignal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTabsModule} from '@angular/material/tabs';
import {MatTableModule} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {AuthService} from '../../core/services/auth.service';
import {UserService} from '../../core/services/user.service';
import {ClientService} from '../../core/services/client.service';
import {User} from '../../core/models/user.model';
import {Client, ClientCreate, ClientUpdate} from '../../core/models/client.model';
import {Attendance, AttendanceStatus} from '../../core/models/attendance.model';
import {AttendanceService} from '../../core/services/attendance.service';
import {EMPTY, forkJoin, Observable, of} from 'rxjs';
import {catchError, filter, switchMap, tap} from 'rxjs/operators';
import {ConfirmationDialogComponent} from './components/confirmation-dialog.component';
import {ClientFormComponent} from './components/client-form/client-form.component';
import {UserFormComponent} from './components/user-form/user-form.component';
import {AttendanceFormComponent} from './components/attendance-form/attendance-form.component';
import {StartExecutionFormComponent} from './components/start-execution-form/start-execution-form.component';
import {AcceptProposalFormComponent} from './components/accept-proposal-form/accept-proposal-form.component';
import {MatChip, MatChipSet} from "@angular/material/chips";
import {environment} from "../../../environments/environment";
import {DeleteWithJustificationDialogComponent} from "./components/delete-with-justification-dialog.component";

interface ManagementState {
  users: User[];
  clients: Client[];
  attendances: Attendance[];
  isLoading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatTableModule, MatButtonModule, MatIconModule, MatChipSet, MatChip],
  templateUrl: './management.html',
  styleUrl: './management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagementComponent implements OnInit {
  protected authService = inject(AuthService);
  private userService = inject(UserService);
  private clientService = inject(ClientService);
  private attendanceService = inject(AttendanceService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  state = signal<ManagementState>({
    users: [],
    clients: [],
    attendances: [],
    isLoading: true,
    error: null,
  });

  // Colunas para as tabelas
  userDisplayedColumns: string[] = ['full_name', 'email', 'role', 'is_active', 'actions'];
  clientDisplayedColumns: string[] = ['company_name', 'contact_name', 'contact_email', 'status', 'actions'];
  attendanceDisplayedColumns: string[] = [];
  selectedTabIndex: WritableSignal<number> = signal(0);
  isProduction = environment.production;

  private statusClassMap: Record<string, string> = {
    [AttendanceStatus.PROPOSTA_CRIADA]: 'status-created',
    [AttendanceStatus.PROPOSTA_ENVIADA]: 'status-proposal',
    [AttendanceStatus.PROPOSTA_ACEITA]: 'status-accepted',
    [AttendanceStatus.PROPOSTA_RECUSADA]: 'status-refused',
    [AttendanceStatus.EM_EXECUCAO]: 'status-executing',
    [AttendanceStatus.PENDENTE]: 'status-pending',
    [AttendanceStatus.FATURADA]: 'status-invoiced',
    [AttendanceStatus.FINALIZADA]: 'status-finished',
  };

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));

    // Define as colunas da tabela de atendimentos dinamicamente
    this.attendanceDisplayedColumns = ['service_description', 'client', 'status', 'due_date'];
    if (this.authService.isAdmin()) {
      // Adiciona a coluna de colaboradores apenas para admins
      this.attendanceDisplayedColumns.push('collaborators');
    }
    this.attendanceDisplayedColumns.push('actions');

    const clients$ = this.clientService.getClients().pipe(
      catchError(() => {
        this.state.update(s => ({ ...s, error: 'Falha ao carregar clientes.' }));
        return of([]); // Retorna um array vazio em caso de erro para não quebrar o forkJoin
      })
    );

    // A chamada de usuários só acontece se for admin
    const users$ = this.authService.isAdmin()
      ? this.userService.getUsers().pipe(
        catchError(() => {
          this.state.update(s => ({ ...s, error: 'Falha ao carregar usuários.' }));
          return of([]);
        })
      )
      : of([]); // Retorna um observable com array vazio se não for admin

    const attendances$ = this.attendanceService.getAttendances().pipe(
      catchError(() => {
        this.state.update(s => ({ ...s, error: 'Falha ao carregar atendimentos.' }));
        return of([]);
      })
    );

    forkJoin({
      clients: clients$,
      users: users$,
      attendances: attendances$
    }).subscribe(({ clients, users, attendances }) => {
      this.state.update(s => ({ ...s, clients, users, attendances, isLoading: false }));
    });
  }

  getStatusClass(status: string): string {
    return this.statusClassMap[status] || 'status-default';
  }

  private handleCrudDialog<T, D, R>(
    dialogComponent: new (...args: any[]) => T,
    dialogData: D,
    serviceCall: (data: R) => Observable<any>,
    entityName: string
  ): void {
    const dialogRef = this.dialog.open<T, D, R>(dialogComponent, {
      width: '500px', // Pode ser ajustado ou passado como parâmetro
      data: dialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result), // Prossegue apenas se houver resultado
      tap(() => this.snackBar.open(`Salvando ${entityName}...`, 'Fechar')),
      switchMap(result => serviceCall(result!).pipe(
        catchError(err => {
          console.error(err);
          const message = err.error?.detail || `Erro ao salvar ${entityName}. Tente novamente.`;
          this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
          return EMPTY;
        })
      ))
    ).subscribe(() => {
      this.snackBar.dismiss();
      this.snackBar.open(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} salvo com sucesso!`, 'Fechar', { duration: 3000 });
      this.loadData();
    });
  }

  openCreateUserDialog(): void {
    // Explicitamente definimos que o tipo de retorno (R) do dialog será UserCreateByAdmin
    type UserCreateByAdmin = Parameters<typeof this.userService.createUser>[0];
    this.handleCrudDialog<UserFormComponent, {}, UserCreateByAdmin>(
      UserFormComponent, {}, data => this.userService.createUser(data), 'usuário'
    );
  }

  openEditUserDialog(user: User): void {
    // Explicitamente definimos que o tipo de retorno (R) do dialog será UserUpdate
    type UserUpdate = Parameters<typeof this.userService.updateUser>[1];
    this.handleCrudDialog<UserFormComponent, { user: User }, UserUpdate>(
      UserFormComponent, { user }, data => this.userService.updateUser(user.id, data), 'usuário'
    );
  }

  openDeleteUserDialog(user: User): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o usuário <strong>${user.full_name}</strong>? Esta ação não pode ser desfeita.`
      }
    });

    dialogRef.afterClosed().pipe(
      filter(result => result === true), // Prossegue apenas se o usuário confirmar
      switchMap(() => this.userService.deleteUser(user.id).pipe(
        catchError(err => {
          console.error(err);
          const message = err.error?.detail || 'Não foi possível excluir o usuário. Verifique se ele não possui atendimentos associados.';
          this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
          return EMPTY; // Interrompe a cadeia do observable em caso de erro
        })
      ))
    ).subscribe(() => {
      this.snackBar.open('Usuário excluído com sucesso!', 'Fechar', { duration: 3000 });
      this.loadData();
    });
  }

  openCreateClientDialog(): void {
    this.handleCrudDialog<ClientFormComponent, {}, ClientCreate>(
      ClientFormComponent, {}, data => this.clientService.createClient(data), 'cliente'
    );
  }

  openEditClientDialog(client: Client): void {
    // O tipo ClientUpdate é Partial<Client>, que já existe.
    this.handleCrudDialog<ClientFormComponent, { client: Client }, ClientUpdate>(
      ClientFormComponent, { client }, data => this.clientService.updateClient(client.id, data), 'cliente'
    );
  }

  openDeleteClientDialog(client: Client): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o cliente <strong>${client.company_name}</strong>? Esta ação não pode ser desfeita.`
      }
    });

    dialogRef.afterClosed().pipe(
      filter(result => result === true),
      switchMap(() => this.clientService.deleteClient(client.id).pipe(
        catchError(err => {
          console.error(err);
          const message = err.error?.detail || 'Não foi possível excluir o cliente. Verifique se ele não possui atendimentos associados.';
          this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
          return EMPTY;
        })
      ))
    ).subscribe(() => {
      this.snackBar.open('Cliente excluído com sucesso!', 'Fechar', { duration: 3000 });
      this.loadData();
    });
  }

  openCreateAttendanceDialog(): void {
    const dialogRef = this.dialog.open(AttendanceFormComponent, {
      width: '600px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Caso 1: Atendimento criado com sucesso.
        this.loadData();
      } else if (result && result.action) {
        // Caso 2: O formulário foi fechado para realizar outra ação.
        // Um pequeno delay para garantir que o primeiro dialog seja totalmente fechado.
        setTimeout(() => {
          if (result.action === 'editClient' && result.clientId) {
            const clientToEdit = this.state().clients.find(c => c.id === result.clientId);
            if (clientToEdit) {
              this.selectedTabIndex.set(1);
              this.openEditClientDialog(clientToEdit);
            }
          } else if (result.action === 'createClient') {
            this.selectedTabIndex.set(1);
            this.openCreateClientDialog();
          }
        }, 100);
      }
      // Se o resultado for undefined (usuário cancelou), não faz nada.
    });
  }

  openEditAttendanceDialog(attendance: Attendance, focusSection?: 'progress' | 'payment'): void {
    const dialogRef = this.dialog.open(AttendanceFormComponent, {
      width: '600px',
      data: { attendance, focusSection }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  openStartExecutionDialog(attendance: Attendance): void {
    const dialogRef = this.dialog.open(StartExecutionFormComponent, {
      width: '600px',
      data: { attendance }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  sendProposal(attendance: Attendance): void {
    // Validação: O link do contrato é obrigatório para enviar a proposta.
    if (!attendance.contract_link) {
      this.snackBar.open('É necessário adicionar o link do contrato para enviar a proposta.', 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
      this.openEditAttendanceDialog(attendance);
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Enviar Proposta',
        message: `Tem certeza que deseja enviar a proposta para o cliente <strong>${attendance.client.company_name}</strong>?`
      }
    });

    dialogRef.afterClosed().pipe(
      filter(result => result === true),
      switchMap(() => this.attendanceService.sendProposal(attendance.id).pipe(
        catchError(err => {
          console.error(err);
          const message = err.error?.detail || 'Erro ao enviar proposta. Tente novamente.';
          this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
          return EMPTY;
        })
      ))
    ).subscribe(() => {
      this.snackBar.open('Proposta enviada com sucesso!', 'Fechar', { duration: 3000 });
      this.loadData();
    });
  }

  acceptProposal(attendance: Attendance): void {
    const dialogRef = this.dialog.open(AcceptProposalFormComponent, {
      width: '500px',
      data: {
        attendance
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadData();
      } else if (result && result.action === 'editClient' && result.clientId) {
        // Se o formulário pediu para editar o cliente, abrimos o dialog de edição do cliente
        const clientToEdit = this.state().clients.find(c => c.id === result.clientId);
        if (clientToEdit) {
          this.openEditClientDialog(clientToEdit);
        }
      }
    });
  }

  refuseProposal(attendance: Attendance): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Recusar Proposta',
        message: `Tem certeza que deseja recusar a proposta para o cliente <strong>${attendance.client.company_name}</strong>?`
      }
    });

    dialogRef.afterClosed().pipe(
      filter(result => result === true),
      switchMap(() => this.attendanceService.refuseProposal(attendance.id).pipe(
        catchError(err => {
          console.error(err);
          const message = err.error?.detail || 'Erro ao recusar proposta. Tente novamente.';
          this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
          return EMPTY;
        })
      ))
    ).subscribe(() => {
      this.snackBar.open('Proposta recusada com sucesso!', 'Fechar', { duration: 3000 });
      this.loadData();
    });
  }

  openDeleteAttendanceDialog(attendance: Attendance): void {
    const dialogRef = this.dialog.open(DeleteWithJustificationDialogComponent, {
      width: '500px',
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o atendimento <strong>${attendance.service_description}</strong>? <br>Esta ação notificará o cliente e os colaboradores envolvidos.`
      }
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result), // Se houver resultado (justificativa)
      switchMap((justification) => this.attendanceService.deleteAttendance(attendance.id, justification).pipe(
        catchError(err => {
          console.error(err);
          const message = err.error?.detail || 'Não foi possível excluir o atendimento.';
          this.snackBar.open(message, 'Fechar', { duration: 5000, panelClass: 'error-snackbar' });
          return EMPTY;
        })
      ))
    ).subscribe(() => {
      this.snackBar.open('Atendimento excluído com sucesso!', 'Fechar', { duration: 3000 });
      this.loadData();
    });
  }
}
