import {Component, Input} from '@angular/core';
import {CommonModule} from "@angular/common";
import {NgxChartsModule} from '@swimlane/ngx-charts';
import {MatCardModule} from "@angular/material/card";
import {MonthlyChartData} from '../../../core/models/financial.model';

@Component({
  selector: 'app-financial-overview',
  standalone: true,
  imports: [CommonModule, MatCardModule, NgxChartsModule],
  templateUrl: './financial-overview.component.html',
  styleUrls: ['./financial-overview.component.scss']
})
export class FinancialOverviewComponent {
  @Input() receivedInPeriod: number = 0;
  @Input() overduePayments: number = 0;
  @Input() upcomingReceivables: number = 0;
  @Input() inProgressValue: number = 0;
  @Input() monthlyChartData: MonthlyChartData[] = [];
}
