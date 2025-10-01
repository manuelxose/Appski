import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LodgingMarketplace } from './lodging-marketplace';

describe('LodgingMarketplace', () => {
  let component: LodgingMarketplace;
  let fixture: ComponentFixture<LodgingMarketplace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LodgingMarketplace]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LodgingMarketplace);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
