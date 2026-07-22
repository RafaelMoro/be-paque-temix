import config from './config';
import { businessTimezoneSchema } from './config.validation';

describe('config timezone validation', () => {
  it('accepts America/Mexico_City', () => {
    const result = businessTimezoneSchema.validate('America/Mexico_City');

    expect(result.error).toBeUndefined();
    expect(result.value).toBe('America/Mexico_City');
  });

  it('rejects absent, arbitrary, fixed-offset, and invalid IANA values', () => {
    expect(businessTimezoneSchema.validate(undefined).error).toBeDefined();
    expect(businessTimezoneSchema.validate('not-a-zone').error).toBeDefined();
    expect(businessTimezoneSchema.validate('UTC-06:00').error).toBeDefined();
    expect(businessTimezoneSchema.validate('America/Not_A_Zone').error).toBeDefined();
  });

  it('exposes the configured business timezone', () => {
    const originalTimezone = process.env.BUSINESS_TIMEZONE;
    process.env.BUSINESS_TIMEZONE = 'America/Mexico_City';

    expect(config()).toMatchObject({
      businessTimezone: 'America/Mexico_City',
    });

    if (originalTimezone === undefined) {
      delete process.env.BUSINESS_TIMEZONE;
    } else {
      process.env.BUSINESS_TIMEZONE = originalTimezone;
    }
  });
});
