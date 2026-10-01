import { EnumOption } from '@ja-platform/parser-schema';

import { describe, it, expect, beforeEach } from 'vitest';
import { Collection, DatabaseObject, WebSQLAdapter, DBSchema as Schema, Attachment } from '../src';

// @ts-ignore
import schema3Xml from './fixtures/schema3.xml?raw';
import { setupContext } from './setup/databaseSetup';

declare module 'vitest' {
  export interface TestContext {
    adapter: WebSQLAdapter;
    schema: Schema;
    db: any;
  }
}

describe('Database with WebSQLAdapter', () => {
  beforeEach(async (context) => {
    const ctx = await setupContext(schema3Xml);
    context.adapter = ctx.adapter;
    context.schema = ctx.schema;
    context.db = ctx.db;
  });

  it('should load a schema', ({ db }) => {
    expect(db.randomobject).toBe(undefined);
    expect(db.asset instanceof Collection).toBe(true);
  });

  it('should create a new object', ({ db }) => {
    const obj = db.asset.create();
    expect(obj instanceof DatabaseObject).toBe(true);
    expect(obj.type.name).toBe('asset');
    obj.make = 'Nokia';
    expect(obj.make).toBe('Nokia');

    expect(obj.notdefined).toBe(undefined);

    // The object is sealed, so we should not be able to add new properties
    expect(function () {
      obj.notdefined = 'Test';
    }).toThrow();

    expect(obj.notdefined).toBe(undefined);

    const id = obj.id;
    expect(id).not.toEqual(null);

    const keys = Object.keys(obj);
    keys.sort();

    expect(keys).toEqual([
      'barcode',
      'class',
      'colours',
      'condition',
      'description',
      'make',
      'model',
      'photo',
      'position',
      'registration_date',
      'serial_number',
      'tnc_signature',
      'updated',
      'verified',
      'weight'
    ]);

    obj.setAll({ model: '5230' });
    expect(obj.make).toBe('Nokia');
    expect(obj.model).toBe('5230');
  });

  it('should cast numbers to strings on string attributes', ({ db }) => {
    const obj = db.asset.create({ make: 123 });
    expect(obj.make).toBe('123');
  });

  it('should not allow strings for numbers attributes', ({ db }) => {
    expect(function () {
      db.asset.create({ condition: 'Bad', weight: 'Heavy' });
    }).toThrow();
  });

  it('should allow EnumOption or a number for an enum attribute', ({ db }) => {
    var obj = db.asset.create({ verified: 0 });
    expect(obj.verified).toEqual(0);

    obj.verified = 1;
    expect(obj.verified).toEqual(1);

    obj.verified = new EnumOption(0, 'Whatever');
    expect(obj.verified).toEqual(0);

    expect(function () {
      obj.verified = 'Yes';
    }).toThrow();

    expect(function () {
      obj.verified = 1.1;
    }).toThrow();

    expect(function () {
      obj.verified = 100;
    }).toThrow();
  });

  it('should only allow UUIDs and Attachment for attachment attributes', ({ db }) => {
    var obj = db.asset.create();
    var validId = '89216540-430c-405b-b537-ff997f178ac9';
    obj.photo = validId;
    expect(obj.photo.id).toBe(validId);
    obj.photo = { id: validId };
    expect(obj.photo.id).toBe(validId);
    obj.photo = new Attachment({ id: validId });
    expect(obj.photo).toEqual(new Attachment({ id: validId }));

    expect(function () {
      obj.photo = 'photo1';
    }).toThrow();
  });

  it('should initialize an object with provided attribute values', ({ db }) => {
    var obj = db.asset.create({
      make: 'Nokia',
      someother: 'Not a valid property'
    });
    expect(obj.make).toBe('Nokia');
    expect(obj.model).toBe(null);
    expect(obj.someother).toBe(undefined);
  });

  it('should error when setting a reserved property', ({ db }) => {
    // Not working properly in CI when minified.
    expect(() => {
      db.asset.create({ save: 'Test' });
    }).toThrow();

    expect(() => {
      const asset = db.asset.create();
      asset.save = 'Test';
    }).toThrow();
  });

  it('should save and load an object', async ({ db }) => {
    var time = new Date();
    var obj = db.asset.create({ make: 'Nokia', model: '5800', updated: time });
    expect(obj.persisted).toBe(false);

    await obj.save();

    expect(obj.persisted).toBe(true);

    var asset = await db.asset.first(obj.id);

    expect(asset.make).toBe('Nokia');
    expect(asset.model).toBe('5800');
    expect(asset.updated).toEqual(time);
  });

  it('should reload an object', async ({ db }) => {
    var obj = db.asset.create({
      make: 'Nokia',
      model: '5800',
      description: 'Test'
    });

    await obj.save();

    var asset = await db.asset.first(obj.id);

    asset.model = '5230';
    asset.description = null;
    await asset.save();

    await obj.reload();

    expect(obj.persisted).toBe(true);
    expect(obj.make).toBe('Nokia');
    expect(obj.model).toBe('5230');
    expect(obj.description).toBe(null);
  });

  it('should reload an object with cleared relationship', async ({ db }) => {
    const obj = db.asset.create({
      make: 'Nokia',
      model: '5800',
      description: 'Test'
    });

    await obj.save();

    const asset = await db.asset.first(obj.id);
    asset.model = '5230';
    asset.description = null;
    await asset.save();

    await obj.reload();

    expect(obj.persisted).toBe(true);
    expect(obj.make).toBe('Nokia');
    expect(obj.model).toBe('5230');
    expect(obj.description).toBe(null);
  });

  it('should destroy an object after fetching', async ({ db }) => {
    var obj = db.asset.create({ make: 'Nokia', model: '5800' });
    await obj.save();

    var asset = await db.asset.first(obj.id);

    expect(asset.persisted).toBe(true);
    await asset.destroy();

    expect(asset.persisted).toBe(false);
    asset = await db.asset.first(obj.id);
    expect(asset).toBe(null);
  });

  it('should not persist an object after destroying', async ({ db }) => {
    const obj = db.asset.create({ make: 'Nokia', model: '5800' });
    await obj.save();

    await obj.destroy();
    await obj.save();

    expect(obj.persisted).toBe(false);
    const asset = await db.asset.first(obj.id);
    expect(asset).toBe(null);
  });

  it('should save and load an object with a query', async ({ db }) => {
    const obj = db.asset.create({ make: 'Nokia', model: '5800' });
    await obj.save();

    const asset = await db.asset.first();

    expect(asset.persisted).toBe(true);
    expect(asset.make).toBe('Nokia');
    expect(asset.model).toBe('5800');
  });

  it('should evaluate the display name', ({ db }) => {
    const obj = db.asset.create({ make: 'Nokia', model: '5800' });
    expect(obj.toString()).toBe('Nokia 5800 []');
  });
});
