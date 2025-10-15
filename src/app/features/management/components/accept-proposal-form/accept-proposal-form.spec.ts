import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AcceptProposalForm} from './accept-proposal-form';

describe('AcceptProposalForm', () => {
  let component: AcceptProposalForm;
  let fixture: ComponentFixture<AcceptProposalForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcceptProposalForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcceptProposalForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
