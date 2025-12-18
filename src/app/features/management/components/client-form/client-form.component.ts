import {Component, Inject, inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ClientService} from '../../../../core/services/client.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Client, ClientStatus} from '../../../../core/models/client.model';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {MatOption, MatSelect} from '@angular/material/select';
import {NgxMaskDirective} from "ngx-mask";
import {TitleCasePipe} from "@angular/common";

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [
    MatFormField,
    MatLabel,
    MatDialogTitle,
    MatDialogContent,
    MatInput,
    ReactiveFormsModule,
    MatDialogActions,
    MatButton,
    MatSelect,
    MatOption,
    TitleCasePipe,
    MatError,
    NgxMaskDirective,
  ],
  templateUrl: './client-form.html',
  styleUrl: './client-form.scss'
})
export class ClientFormComponent implements OnInit {
  private readonly fullNamePattern = '^[a-zA-ZÀ-ú]+(?:\\s[a-zA-ZÀ-ú]+)+$';
  private readonly emailPattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';

  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private snackBar = inject(MatSnackBar);

  clientForm!: FormGroup;
  isEditMode: boolean;
  clientStatuses: ClientStatus[] = ['potencial', 'ativo', 'inativo'];

  constructor(
    public dialogRef: MatDialogRef<ClientFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { client?: Client }
  ) {
    this.isEditMode = !!this.data?.client;
  }

  ngOnInit(): void {
    this.clientForm = this.fb.group({
      company_name: [this.data?.client?.company_name || '', Validators.required],
      contact_name: [this.data?.client?.contact_name || '', [
        Validators.required,
        Validators.pattern(this.fullNamePattern)
      ]],
      contact_email: [this.data?.client?.contact_email || '', [
        Validators.required,
        Validators.pattern(this.emailPattern)
      ]],
      contact_phone: [this.data?.client?.contact_phone || '', [
        Validators.required,
      ]],
      finance_contact_name: [this.data?.client?.finance_contact_name || '', [Validators.pattern(this.fullNamePattern)]],
      finance_contact_email: [this.data?.client?.finance_contact_email || '', [Validators.pattern(this.emailPattern)]],
      finance_contact_phone: [this.data?.client?.finance_contact_phone || null],
      status: [this.data?.client?.status || 'potencial', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.clientForm.invalid) {
      return;
    }
    // Fecha o dialog e passa os dados do formulário para o componente pai.
    this.dialogRef.close(this.clientForm.value);
  }
}