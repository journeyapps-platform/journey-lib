/**
 * Parse a value explicitly and check its resolved representation.
 */
export interface ValueType<T> {
  readonly name: string;
  is(value: unknown): value is T;
  parse(value: unknown): T;
}

export const TextType: ValueType<string> = {
  name: 'text',
  is: (value): value is string => typeof value === 'string',
  parse: (value) => String(value ?? '')
};

export const NumberType: ValueType<number> = {
  name: 'number',
  is: (value): value is number => typeof value === 'number' && Number.isFinite(value),
  parse(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    throw new SyntaxError('Expected a finite number.');
  }
};

export const BooleanType: ValueType<boolean> = {
  name: 'boolean',
  is: (value): value is boolean => typeof value === 'boolean',
  parse(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const text = value.trim();
      if (text === 'true' || text === 'false') return text === 'true';
      if (text !== '' && Number.isFinite(Number(text))) return Number(text) !== 0;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
    throw new SyntaxError('Expected a boolean or finite number.');
  }
};
