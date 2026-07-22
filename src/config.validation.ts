import * as Joi from 'joi';
import { IANAZone } from 'luxon';

export const isValidBusinessTimezone = (value?: string): value is string => {
  return typeof value === 'string' && value.includes('/') && IANAZone.isValidZone(value);
};

export const businessTimezoneSchema = Joi.string()
  .required()
  .custom((value: string, helpers) => {
    if (isValidBusinessTimezone(value)) return value;

    return helpers.error('any.invalid');
  }, 'IANA timezone validation')
  .messages({
    'any.invalid': '{{#label}} must be a valid IANA timezone',
  });
