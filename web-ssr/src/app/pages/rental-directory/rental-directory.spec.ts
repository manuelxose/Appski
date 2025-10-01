import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RentalDirectory } from './rental-directory';

describe('RentalDirectory', () => {
  let component: RentalDirectory;
  let fixture: ComponentFixture<RentalDirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RentalDirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RentalDirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
