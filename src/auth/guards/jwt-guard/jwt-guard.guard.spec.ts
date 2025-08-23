import { JwtGuard } from './jwt-guard.guard';

describe('JwtGuardGuard', () => {
  it('should be defined', () => {
    expect(new JwtGuard()).toBeDefined();
  });
});
