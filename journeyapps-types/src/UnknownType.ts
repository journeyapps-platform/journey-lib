import { Type } from './Type';

/**
 * A value whose type is unknown, distinct from an undeclared reference.
 */
export class UnknownType extends Type {
  readonly _typeName = 'unknown';
  readonly name = 'unknown';

  constructor() {
    super('unknown');
  }
}
