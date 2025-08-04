import { TestBed } from '@angular/core/testing';

import { AguaService } from './agua.service';

describe('AguaService', () => {
  let service: AguaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AguaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
