import { describe, expect, it, vi } from 'vitest';
import { ObjectDisplayScope } from '../src/database/ObjectDisplayScope';

describe('ObjectDisplayScope', () => {
  it('reads nested paths and preserves missing-value semantics', async () => {
    const scope = new ObjectDisplayScope({ person: { name: 'Sam', missing: null } });
    expect(scope.getValue('person.name')).toBe('Sam');
    expect(await scope.getValuePromise(['person', 'name'])).toBe('Sam');
    expect(scope.getValue(['person', 'missing', 'name'])).toBeNull();
    expect(await scope.getValuePromise('person.missing.name')).toBeNull();
    expect(scope.getValue('unknown')).toBeNull();
    expect(await scope.getValuePromise('unknown')).toBeUndefined();
    for (const [name, value] of [
      ['null', null],
      ['true', true],
      ['false', false]
    ] as const) {
      expect(scope.getValue(name)).toBe(value);
      expect(await scope.getValuePromise(name)).toBe(value);
    }
  });

  it('does not treat plain object functions as database accessors', async () => {
    const accessor = vi.fn();
    const scope = new ObjectDisplayScope({
      _cached: accessor,
      _get: accessor,
      customer: { name: 'Sam' },
      load: accessor
    });
    expect(scope.getValue(['customer', 'name'])).toBe('Sam');
    expect(await scope.getValuePromise(['customer', 'name'])).toBe('Sam');
    expect(await scope.getValuePromise(['load'])).toBe(accessor);
    expect(accessor).not.toHaveBeenCalled();
  });
});
