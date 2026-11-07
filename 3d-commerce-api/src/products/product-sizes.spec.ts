import { sellsInSizes, sizeVariantsOf } from './product-sizes';

describe('sellsInSizes', () => {
  it('defaults to sizes on', () => {
    expect(sellsInSizes({})).toBe(true);
    expect(sellsInSizes({ hasSizes: undefined })).toBe(true);
    expect(sellsInSizes({ hasSizes: null })).toBe(true);
    expect(sellsInSizes({ hasSizes: true })).toBe(true);
  });

  it('is off only when explicitly false', () => {
    expect(sellsInSizes({ hasSizes: false })).toBe(false);
  });
});

describe('sizeVariantsOf', () => {
  const variants = [{ id: 's' }, { id: 'm' }];

  it('returns the variants when sizes are on', () => {
    expect(sizeVariantsOf({ hasSizes: true }, variants)).toEqual(variants);
  });

  it('ignores the variants when sizes are off', () => {
    expect(sizeVariantsOf({ hasSizes: false }, variants)).toEqual([]);
  });
});
