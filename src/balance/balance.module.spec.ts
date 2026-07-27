import { MODULE_METADATA } from '@nestjs/common/constants';
import { MailModule } from '@/mail/mail.module';
import { UsersModule } from '@/users/users.module';
import { BalanceController } from './controllers/balance.controller';
import { Balance } from './entities/balance.entity';
import { BalanceRequest } from './entities/balance-request.entity';
import { BalanceModule } from './balance.module';
import { BalanceService } from './services/balance.service';

describe('BalanceModule', () => {
  it('registers its service, controller, dependencies, and persistence models', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, BalanceModule);
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      BalanceModule,
    );
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      BalanceModule,
    );
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, BalanceModule);

    expect(imports).toEqual(expect.arrayContaining([UsersModule, MailModule]));
    expect(providers).toContain(BalanceService);
    expect(controllers).toContain(BalanceController);
    expect(exports).toContain(BalanceService);
    expect(imports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ module: expect.any(Function) }),
      ]),
    );
    expect(Balance.name).toBe('Balance');
    expect(BalanceRequest.name).toBe('BalanceRequest');
  });
});
