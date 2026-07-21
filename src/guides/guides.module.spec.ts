import { MODULE_METADATA } from '@nestjs/common/constants';
import { BalanceModule } from '@/balance/balance.module';
import { GuidesModule } from './guides.module';

describe('GuidesModule', () => {
  it('imports BalanceModule for persisted guide wallet operations', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, GuidesModule);
    expect(imports).toContain(BalanceModule);
  });
});
