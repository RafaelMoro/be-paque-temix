import { DateTime } from 'luxon';

export interface BusinessMonthRangeOptions {
  businessTimezone: string;
  month?: number;
  year?: number;
  now?: Date;
}

export interface BusinessMonthRange {
  month: number;
  year: number;
  startOfMonth: Date;
  startOfNextMonth: Date;
}

export interface BusinessYearMonthOptions {
  businessTimezone: string;
  now?: Date;
}

const OFFSET_DATE_TIME_PATTERN = /T.*(?:Z|[+-]\d{2}:\d{2})$/;

const getBusinessNow = ({
  businessTimezone,
  now,
}: BusinessYearMonthOptions): DateTime => {
  if (now)
    return DateTime.fromJSDate(now, { zone: 'utc' }).setZone(businessTimezone);

  return DateTime.now().setZone(businessTimezone);
};

export const getBusinessMonthRange = ({
  businessTimezone,
  month,
  year,
  now,
}: BusinessMonthRangeOptions): BusinessMonthRange => {
  const businessNow = getBusinessNow({ businessTimezone, now });
  const resolvedMonth = month ?? businessNow.month;
  const resolvedYear = year ?? businessNow.year;
  const startOfMonth = DateTime.fromObject(
    {
      year: resolvedYear,
      month: resolvedMonth,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    { zone: businessTimezone },
  );

  if (!startOfMonth.isValid) {
    throw new Error(
      startOfMonth.invalidExplanation ?? 'Invalid business month range',
    );
  }

  return {
    month: resolvedMonth,
    year: resolvedYear,
    startOfMonth: startOfMonth.toUTC().toJSDate(),
    startOfNextMonth: startOfMonth.plus({ months: 1 }).toUTC().toJSDate(),
  };
};

export const getBusinessYearMonth = ({
  businessTimezone,
  now,
}: BusinessYearMonthOptions): string => {
  const businessNow = getBusinessNow({ businessTimezone, now });

  return `${businessNow.year}${businessNow.month.toString().padStart(2, '0')}`;
};

export const parseOffsetDateTime = (value: string): Date => {
  if (!OFFSET_DATE_TIME_PATTERN.test(value)) {
    throw new Error('Date-time value must include an explicit UTC offset');
  }

  const dateTime = DateTime.fromISO(value, { setZone: true });

  if (!dateTime.isValid) {
    throw new Error(
      dateTime.invalidExplanation ?? 'Invalid ISO date-time value',
    );
  }

  return dateTime.toUTC().toJSDate();
};
