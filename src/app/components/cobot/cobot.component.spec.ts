import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CobotComponent } from './cobot.component';

describe('CobotComponent', () => {
  let component: CobotComponent;
  let fixture: ComponentFixture<CobotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CobotComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CobotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
