import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-delete-with-justification-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p [innerHTML]="data.message"></p>
      <mat-form-field appearance="fill" style="width: 100%">
        <mat-label>Justificativa (Obrigatória)</mat-label>
        <textarea matInput [formControl]="justificationControl" rows="4" required placeholder="Informe o motivo da exclusão para notificar os envolvidos..."></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="justificationControl.value" [disabled]="justificationControl.invalid">Excluir</button>
    </mat-dialog-actions>
  `
})
export class DeleteWithJustificationDialogComponent {
  justificationControl = new FormControl('', [Validators.required, Validators.minLength(10)]);

  constructor(
    public dialogRef: MatDialogRef<DeleteWithJustificationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
  ) {}
}
