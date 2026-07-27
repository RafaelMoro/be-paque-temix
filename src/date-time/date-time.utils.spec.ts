import {
  getBusinessMonthRange,
  getBusinessYearMonth,
  parseOffsetDateTime,
} from './date-time.utils';

describe('date-time utils', () => {
  describe('getBusinessMonthRange', () => {
    it('returns explicit Mexico City local-month UTC boundaries', () => {
      const range = getBusinessMonthRange({
        businessTimezone: 'America/Mexico_City',
        month: 2,
        year: 2026,
      });

      expect(range).toEqual({
        month: 2,
        year: 2026,
        startOfMonth: new Date('2026-02-01T06:00:00.000Z'),
        startOfNextMonth: new Date('2026-03-01T06:00:00.000Z'),
      });
    });

    it('defaults omitted month and year from the business timezone', () => {
      const range = getBusinessMonthRange({
        businessTimezone: 'America/Mexico_City',
        now: new Date('2026-02-01T05:59:59.999Z'),
      });

      expect(range.month).toBe(1);
      expect(range.year).toBe(2026);
      expect(range.startOfMonth).toEqual(new Date('2026-01-01T06:00:00.000Z'));
      expect(range.startOfNextMonth).toEqual(new Date('2026-02-01T06:00:00.000Z'));
    });

    it('defaults partial month and year values from the business timezone', () => {
      const now = new Date('2026-02-01T05:59:59.999Z');

      expect(
        getBusinessMonthRange({
          businessTimezone: 'America/Mexico_City',
          month: 6,
          now,
        }),
      ).toMatchObject({ month: 6, year: 2026 });
      expect(
        getBusinessMonthRange({
          businessTimezone: 'America/Mexico_City',
          year: 2027,
          now,
        }),
      ).toMatchObject({ month: 1, year: 2027 });
    });

    it('uses named-zone DST offsets instead of a fixed offset', () => {
      const range = getBusinessMonthRange({
        businessTimezone: 'America/New_York',
        month: 3,
        year: 2026,
      });

      expect(range.startOfMonth).toEqual(new Date('2026-03-01T05:00:00.000Z'));
      expect(range.startOfNextMonth).toEqual(new Date('2026-04-01T04:00:00.000Z'));
    });
  });

  describe('getBusinessYearMonth', () => {
    it('returns the business-zone calendar identifier at a UTC month boundary', () => {
      expect(
        getBusinessYearMonth({
          businessTimezone: 'America/Mexico_City',
          now: new Date('2026-02-01T05:59:59.999Z'),
        }),
      ).toBe('202601');
      expect(
        getBusinessYearMonth({
          businessTimezone: 'America/Mexico_City',
          now: new Date('2026-02-01T06:00:00.000Z'),
        }),
      ).toBe('202602');
    });
  });

  describe('parseOffsetDateTime', () => {
    it('parses Z and numeric-offset date-time values to UTC dates', () => {
      expect(parseOffsetDateTime('2026-02-01T06:00:00Z')).toEqual(
        new Date('2026-02-01T06:00:00.000Z'),
      );
      expect(parseOffsetDateTime('2026-02-01T00:00:00-06:00')).toEqual(
        new Date('2026-02-01T06:00:00.000Z'),
      );
    });

    it('rejects date-only, offset-free, and malformed values', () => {
      expect(() => parseOffsetDateTime('2026-02-01')).toThrow();
      expect(() => parseOffsetDateTime('2026-02-01T00:00:00')).toThrow();
      expect(() => parseOffsetDateTime('not-a-date')).toThrow();
    });
  });
});
