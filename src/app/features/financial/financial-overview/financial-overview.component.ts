import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MatCardModule} from "@angular/material/card";

@Component({
  selector: 'app-financial-overview',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './financial-overview.component.html',
  styleUrls: ['./financial-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialOverviewComponent {
  receivedInPeriod = input<number>(0);
  overduePayments = input<number>(0);
  upcomingReceivables = input<number>(0);
  inProgressValue = input<number>(0);
}
