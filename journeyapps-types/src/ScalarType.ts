import { Type } from './Type';

/**
 * Parse a value explicitly and check its resolved representation.
 */
export abstract class ScalarType<T> extends Type<T> {
  abstract is(value: unknown): value is T;
  abstract parse(value: unknown): T;
}
