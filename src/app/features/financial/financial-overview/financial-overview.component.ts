import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MatTableModule} from "@angular/material/table";
import {MatIconModule} from "@angular/material/icon";
import {NgxChartsModule} from '@swimlane/ngx-charts';
import {MatCardModule} from "@angular/material/card";
import {DetailedEntry, MonthlyChartData} from "../../../core/models/financial.model";
import {MatDialog} from "@angular/material/dialog";
import {AuthService} from "../../../core/services/auth.service";
import {AddDiscountFormComponent} from "../add-discount-form/add-discount-form.component";
import {MatButtonModule} from "@angular/material/button";

@Component({
  selector: 'app-financial-overview',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, NgxChartsModule, MatButtonModule],
  templateUrl: './financial-overview.component.html',
  styleUrls: ['./financial-overview.component.scss']
})
export class FinancialOverviewComponent {
  @Input() receivedInPeriod: number = 0;
  @Input() overduePayments: number = 0;
  @Input() upcomingReceivables: number = 0;
  @Input() inProgressValue: number = 0;
  @Input() monthlyChartData: MonthlyChartData[] = [];
  @Input() detailedEntries: DetailedEntry[] = [];
  @Output() dataChanged = new EventEmitter<void>();

  authService = inject(AuthService);
  private dialog = inject(MatDialog);

  // Columns for the detailed table
  displayedColumns: string[] = ['type', 'client', 'description', 'due_date', 'value', 'actions'];

  openAddDiscountDialog(entry: DetailedEntry): void {
    const dialogRef = this.dialog.open(AddDiscountFormComponent, {
      width: '500px',
      data: {
        attendanceId: entry.id,
        serviceDescription: entry.service_description
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.dataChanged.emit();
      }
    });
  }
}
