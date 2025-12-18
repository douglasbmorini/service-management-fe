import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AcceptProposalFormComponent} from './accept-proposal-form.component';

describe('AcceptProposalFormComponent', () => {
  let component: AcceptProposalFormComponent;
  let fixture: ComponentFixture<AcceptProposalFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcceptProposalFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcceptProposalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
