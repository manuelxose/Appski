import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationsList } from './stations-list';

describe('StationsList', () => {
  let component: StationsList;
  let fixture: ComponentFixture<StationsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StationsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
