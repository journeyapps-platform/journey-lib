import { SchemaModelType, Query, WebSQLAdapter } from '../src';
import { describe, it, expect, beforeEach } from 'vitest';
import * as uuid from 'uuid';

declare module 'vitest' {
  export interface TestContext {
    adapter: WebSQLAdapter;
  }
}

beforeEach(async (context) => {
  const cleared = await WebSQLAdapter.clear();
  expect(cleared).toEqual([true, true]);
  context.adapter = new WebSQLAdapter({ name: 'objects', stf: false });
  await context.adapter.open();
});

describe('WebSQLAdapter', async () => {
  it('should save and load an object on the adapter', async ({ adapter }) => {
    await adapter.applyBatch([
      {
        op: 'put',
        id: '12345',
        type: 'asset',
        data: {
          attributes: { make: 'Nokia', model: '5800' },
          belongs_to: {}
        },
        object: null
      }
    ]);

    expect(await adapter.get('asset', '12345')).toEqual({
      id: '12345',
      type: 'asset',
      attributes: { make: 'Nokia', model: '5800' },
      belongs_to: {}
    });
  });

  it('should get multiple objects from the adapter', async ({ adapter }) => {
    await adapter.applyBatch([
      {
        op: 'put',
        id: '101',
        type: 'asset',
        data: {
          attributes: { make: 'Nokia', model: '5800' },
          belongs_to: {}
        },
        object: null
      },
      {
        op: 'put',
        id: '102',
        type: 'asset',
        data: {
          attributes: { make: 'Nokia', model: '5230' },
          belongs_to: {}
        },
        object: null
      }
    ]);

    const results = await adapter.getAll('asset', ['101', '102', '10X']);
    expect(results).toEqual([
      {
        id: '101',
        type: 'asset',
        attributes: { make: 'Nokia', model: '5800' },
        belongs_to: {}
      },
      {
        id: '102',
        type: 'asset',
        attributes: { make: 'Nokia', model: '5230' },
        belongs_to: {}
      },
      null
    ]);
  });

  it('should query from the adapter', async ({ adapter }) => {
    // We also add some objects with closely-related object types, and check that they're not returned.
    await adapter.applyBatch([
      {
        op: 'put',
        id: '100',
        type: 'assetz',
        data: {
          attributes: { make: 'Nokia', model: '5800' },
          belongs_to: {}
        },
        object: null
      },
      {
        op: 'put',
        id: '101',
        type: 'asset',
        data: {
          attributes: { make: 'Nokia', model: '5800' },
          belongs_to: {}
        },
        object: null
      },
      {
        op: 'put',
        id: '102',
        type: 'asset',
        data: {
          attributes: { make: 'Nokia', model: '5230' },
          belongs_to: {}
        },
        object: null
      },
      {
        op: 'put',
        id: '104',
        type: 'asse',
        data: {
          attributes: { make: 'Nokia', model: '5800' },
          belongs_to: {}
        },
        object: null
      },
      {
        op: 'put',
        id: '103',
        type: 'asset_',
        data: {
          attributes: { make: 'Nokia', model: '5230' },
          belongs_to: {}
        },
        object: null
      }
    ]);

    const query = new Query(adapter, { name: 'asset' } as SchemaModelType);

    const results = await adapter.executeQuery(query);

    expect(results.length).toBe(2);
    expect(results).toEqual([
      {
        id: '101',
        type: 'asset',
        attributes: { make: 'Nokia', model: '5800' },
        belongs_to: {}
      },
      {
        id: '102',
        type: 'asset',
        attributes: { make: 'Nokia', model: '5230' },
        belongs_to: {}
      }
    ]);
  });
});

describe('WebSQLAdapter - sync', async () => {
  it('should perform crud', async ({ adapter }) => {
    const id = uuid.v1();
    const asset1 = {
      type: 'asset',
      id: id,
      update_id: '00A',
      hash: 123,
      attributes: { make: 'Nokia', model: '5800' }
    };
    await adapter.applyCrud([{ put: asset1 }]);

    await adapter.get('asset', id).then((data) => {
      expect(data.id).toBe(id);
      expect(data.attributes).toEqual({ make: 'Nokia', model: '5800' });
    });

    // It should clear the update_id and hash after updating locally.

    await adapter.applyBatch([
      {
        op: 'put',
        id: id,
        type: 'asset',
        data: {
          attributes: { make: 'Nokia', model: '5230' },
          belongs_to: {}
        },
        object: null
      }
    ]);

    await adapter.get('asset', id).then((data) => {
      expect(data.id).toBe(id);
      expect(data.attributes).toEqual({ make: 'Nokia', model: '5230' });
    });

    // It should delete a record

    await adapter.applyCrud([{ delete: { id: id, type: 'asset' } }]);

    await adapter.get('asset', id).then((data) => {
      expect(data).toBe(null);
    });
  });
});
