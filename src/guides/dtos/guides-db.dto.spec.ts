import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateGuideDto,
  CreateGuideQueryDto,
  UpdateGuideDto,
} from './guides-db.dto';

describe('guide database DTOs', () => {
  it('requires a finite positive total when creating a guide', async () => {
    const valid = plainToInstance(CreateGuideDto, {
      quote: { id: 'quote', total: 1.15 },
    });
    const missing = plainToInstance(CreateGuideDto, { quote: { id: 'quote' } });
    const invalid = plainToInstance(CreateGuideDto, {
      quote: { id: 'quote', total: 0 },
    });

    expect((await validate(valid)).find((error) => error.property === 'quote')).toBeUndefined();
    expect((await validate(missing)).some((error) => error.children?.length)).toBe(true);
    expect((await validate(invalid)).some((error) => error.children?.length)).toBe(true);
  });

  it('keeps quote totals optional for guide updates', async () => {
    const dto = plainToInstance(UpdateGuideDto, { quote: { id: 'quote' } });
    expect((await validate(dto)).find((error) => error.property === 'quote')).toBeUndefined();
  });

  it.each([
    ['true', true],
    ['false', false],
    [undefined, undefined],
  ])('coerces bypassBalance %p to %p', (input, expected) => {
    const dto = plainToInstance(CreateGuideQueryDto, { bypassBalance: input });
    expect(dto.bypassBalance).toBe(expected);
  });
});
