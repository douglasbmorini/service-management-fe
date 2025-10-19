import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, inject, OnInit} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import {finalize, map, Observable, of, startWith} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatSelectModule} from '@angular/material/select';
import {AsyncPipe, DatePipe} from '@angular/common';
import {Attendance, AttendanceStatus, BillingType} from '../../../../core/models/attendance.model';
import {Client} from '../../../../core/models/client.model';
import {AttendanceService} from '../../../../core/services/attendance.service';
import {ClientService} from '../../../../core/services/client.service';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {CdkTextareaAutosize} from '@angular/cdk/text-field';
import {MatListModule} from "@angular/material/list";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {ImmediateErrorStateMatcher} from "../../../../shared/utils/form-utils";

export function maxHoursValidator(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined) {
      return null;
    }
    const hours = parseFloat(control.value);
    if (isNaN(hours) || hours <= 0) {
      return null; // Deixa a validação de 'min' cuidar disso
    }
    if (hours > max) {
      return {maxHoursExceeded: {max: max, actual: hours}};
    }
    return null;
  };
}

@Component({
  selector: 'app-attendance-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDatepickerModule,
    CdkTextareaAutosize,
    AsyncPipe,
    MatListModule,
    MatDividerModule,
    MatIconModule,
    DatePipe
  ],
  templateUrl: './attendance-form.html',
  styleUrl: './attendance-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceForm implements OnInit {
  private fb = inject(FormBuilder);
  private attendanceService = inject(AttendanceService);
  private clientService = inject(ClientService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private readonly urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-.\/?%&=]*)?$/;

  attendanceForm!: FormGroup;
  progressNoteForm!: FormGroup;
  isEditMode: boolean;
  isSaving = false;
  clients$: Observable<Client[]>;
  newBlockerNoteControl = new FormControl('', [Validators.required]);
  isAddingProgressNote = false;
  isAddingBlockerNote = false;
  private dataChanged = false;

  // Instance of the custom error state matcher.
  immediateErrorMatcher = new ImmediateErrorStateMatcher();

  constructor(
    public dialogRef: MatDialogRef<AttendanceForm>,
    @Inject(MAT_DIALOG_DATA) public data: { attendance?: Attendance }
  ) {
    this.isEditMode = !!this.data?.attendance;

    if (this.isEditMode && this.data.attendance) {
      // Em modo de edição, cria um observable com o cliente do próprio atendimento.
      this.clients$ = of([this.data.attendance.client]);
    } else {
      // Em modo de criação, busca todos os clientes ativos na API.
      this.clients$ = this.clientService.getClients().pipe(
        map(clients => clients.filter(client => client.status === 'ativo'))
      );
    }
  }

  ngOnInit(): void {
    // Estrutura base do formulário para criação e edição
    this.attendanceForm = this.fb.group({
      client_id: [this.data?.attendance?.client_id || '', Validators.required],
      billing_type: [this.data?.attendance?.billing_type || BillingType.FIXED_PRICE, Validators.required],
      service_description: [this.data?.attendance?.service_description || '', Validators.required],
      contract_link: [this.data?.attendance?.contract_link || '', [Validators.pattern(this.urlPattern)]],
    });

    // Adiciona o controle de horas e a lógica de validação condicional
    this.setupTotalHoursControl();

    if (this.isEditMode && this.data.attendance) {
      const attendance = this.data.attendance;
      this.attendanceForm.get('client_id')?.disable();
      this.attendanceForm.get('billing_type')?.disable();

      // O link do contrato só pode ser editado até a proposta ser enviada
      if (attendance.status !== AttendanceStatus.PROPOSTA_CRIADA && attendance.status !== AttendanceStatus.PROPOSTA_ENVIADA) {
        this.attendanceForm.get('contract_link')?.disable();
      }

      // Adiciona campos de atualização com base no status do atendimento
      if (attendance.due_date) {
        // A data de vencimento é definida no aceite da proposta e depois fica apenas para visualização
        this.attendanceForm.addControl('due_date', this.fb.control({ value: new Date(attendance.due_date), disabled: true }));
      }

      // Campos de progresso são editáveis apenas durante a execução
      // Link da fatura é editável para mover o atendimento para FATURADA
      if (attendance.status === AttendanceStatus.EM_EXECUCAO) {
        this.attendanceForm.addControl('invoice_link', this.fb.control(attendance.invoice_link || '', [Validators.pattern(this.urlPattern)]));
      }
      // Link do pagamento é editável para mover o atendimento para FINALIZADA
      if (attendance.status === AttendanceStatus.FATURADA) {
        this.attendanceForm.addControl('payment_receipt_link', this.fb.control(attendance.payment_receipt_link || '', [Validators.pattern(this.urlPattern)]));
      }

      // Inicializa o formulário de nota de progresso
      this.progressNoteForm = this.fb.group({
        note: ['', Validators.required],
        hours_spent: [null] // Validador condicional abaixo
      });

      if (attendance.total_hours) {
        const remainingHours = (attendance.total_hours || 0) - (attendance.hours_worked || 0);
        this.progressNoteForm.get('hours_spent')?.setValidators([
          Validators.required,
          Validators.min(0.1),
          maxHoursValidator(remainingHours)
        ]);
      }
    }
  }

  private setupTotalHoursControl(): void {
    // Adiciona o controle ao formulário, desabilitado se estiver em modo de edição.
    this.attendanceForm.addControl(
      'total_hours',
      this.fb.control({
        value: this.isEditMode ? this.data.attendance?.total_hours : null,
        disabled: this.isEditMode
      })
    );

    // Lógica para tornar 'total_hours' obrigatório se o tipo for HOURLY (apenas na criação)
    if (!this.isEditMode) {
      this.attendanceForm.get('billing_type')?.valueChanges.pipe(
        startWith(this.attendanceForm.get('billing_type')?.value)
      ).subscribe(type => {
        const totalHoursControl = this.attendanceForm.get('total_hours');
        if (type === BillingType.HOURLY) {
          totalHoursControl?.setValidators([Validators.required, Validators.min(1)]);
        } else {
          totalHoursControl?.clearValidators();
        }
        totalHoursControl?.updateValueAndValidity();
      });
    }
  }

  onSubmit(): void {
    if (this.attendanceForm.invalid || this.isSaving) return;

    this.isSaving = true;

    // Usamos getRawValue() para incluir campos desabilitados como client_id e billing_type no modo de edição.
    const formValue = this.attendanceForm.getRawValue();

    const request$ = this.isEditMode
      ? this.attendanceService.updateAttendance(this.data.attendance!.id, formValue)
      : this.attendanceService.createAttendance(formValue);

    request$.pipe(finalize(() => this.isSaving = false)).subscribe({
      next: () => {
        this.snackBar.open(`Atendimento ${this.isEditMode ? 'atualizado' : 'criado'} com sucesso!`, 'Fechar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        const message = err.error?.detail || 'Erro ao salvar atendimento. Tente novamente.';
        this.snackBar.open(message, 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
      }
    });
  }

  navigateToClientCreation(): void {
    // Fecha o dialog atual e informa ao componente pai para abrir o dialog de criação de cliente.
    this.dialogRef.close({ action: 'createClient' });
  }

  onAddProgressNote(): void {
    if (this.progressNoteForm.invalid || this.isAddingProgressNote) return;
    this.isAddingProgressNote = true;
    const payload = this.progressNoteForm.value;
    this.attendanceService.addProgressNote(this.data.attendance!.id, payload)
      .pipe(finalize(() => this.isAddingProgressNote = false))
      .subscribe({
        next: () => {
          this.dataChanged = true;
          this.snackBar.open('Nota de progresso adicionada.', 'Fechar', { duration: 3000 });
          this.progressNoteForm.reset();
          this.reloadData();
        },
        error: (err) => this.handleNoteError(err, 'progresso')
      });
  }

  onAddBlockerNote(): void {
    if (this.newBlockerNoteControl.invalid || this.isAddingBlockerNote) return;
    this.isAddingBlockerNote = true;
    this.attendanceService.addBlockerNote(this.data.attendance!.id, this.newBlockerNoteControl.value!)
      .pipe(finalize(() => this.isAddingBlockerNote = false))
      .subscribe({
        next: () => {
          this.dataChanged = true;
          this.snackBar.open('Nota de bloqueio adicionada.', 'Fechar', { duration: 3000 });
          this.newBlockerNoteControl.reset();
          this.reloadData();
        },
        error: (err) => this.handleNoteError(err, 'bloqueio')
      });
  }

  onResolveBlocker(noteId: number): void {
    this.attendanceService.resolveBlockerNote(this.data.attendance!.id, noteId)
      .subscribe({
        next: () => {
          this.dataChanged = true;
          this.snackBar.open('Bloqueio resolvido.', 'Fechar', { duration: 3000 });
          this.reloadData();
        },
        error: (err) => this.handleNoteError(err, 'resolução de bloqueio')
      });
  }

  closeDialog(): void {
    this.dialogRef.close(this.dataChanged);
  }

  /**
   * Recarrega os dados do atendimento a partir da API.
   * Isso garante que o formulário reflita o estado mais recente,
   * especialmente após adicionar/resolver notas.
   */
  private reloadData(): void {
    this.attendanceService.getAttendanceById(this.data.attendance!.id).subscribe({
      next: updatedAttendance => {
        this.data.attendance = updatedAttendance;
        this.updateProgressNoteValidators();
        this.cdr.markForCheck(); // Notifica o Angular para verificar as mudanças
      },
      error: (err) => this.handleNoteError(err, 'recarregamento de dados')
    });
  }

  private handleNoteError(err: any, type: string): void {
    console.error(err);
    const message = err.error?.detail || `Erro ao salvar nota de ${type}. Tente novamente.`;
    this.snackBar.open(message, 'Fechar', { duration: 4000, panelClass: 'error-snackbar' });
  }

  /**
   * Atualiza os validadores do campo de horas gastas com base nas horas restantes.
   */
  private updateProgressNoteValidators(): void {
    if (!this.isEditMode || !this.data.attendance?.total_hours) return;

    const attendance = this.data.attendance;
    const remainingHours = (attendance.total_hours || 0) - (attendance.hours_worked || 0);
    const hoursSpentControl = this.progressNoteForm.get('hours_spent');

    hoursSpentControl?.setValidators([
      Validators.required,
      Validators.min(0.1),
      maxHoursValidator(remainingHours)
    ]);
    hoursSpentControl?.updateValueAndValidity();
  }
}
