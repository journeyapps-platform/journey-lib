import { describe, it, expect, beforeEach } from 'vitest';
import { DBTestContext, setupContext } from './setup/databaseSetup';

// @ts-ignore
import schema3Xml from './fixtures/schema3.xml?raw';

declare module 'vitest' {
  export interface TestContext extends DBTestContext {
    first: any;
    second: any;
    third: any;
  }
}

describe('DB querying', () => {
  beforeEach(async (context) => {
    const ctx = await setupContext(schema3Xml);
    context.adapter = ctx.adapter;
    context.schema = ctx.schema;
    context.db = ctx.db;

    context.first = context.db.asset.create({ make: 'Nokia', model: '5800' });
    context.second = context.db.asset.create({ make: 'Nokia', model: '5230' });
    context.third = context.db.asset.create({ make: 'Samsung', model: '5230' });

    await Promise.all([context.first.save(), context.second.save(), context.third.save()]);
  });

  it('should load all objects with all()', async ({ db }) => {
    const assets = await db.asset.all().orderBy('make').toArray();
    expect(assets.length).toBe(3);
    expect(assets[0].make).toBe('Nokia');
    expect(assets[1].make).toBe('Nokia');
    expect(assets[2].make).toBe('Samsung');
  });

  it('should load all objects with where()', async ({ db }) => {
    const assets = await db.asset.where().orderBy('make').toArray();

    expect(assets.length).toBe(3);
    expect(assets[0].make).toBe('Nokia');
    expect(assets[1].make).toBe('Nokia');
    expect(assets[2].make).toBe('Samsung');
  });

  it('should filter by attribute', async ({ db }) => {
    var assets = await db.asset.where('model = ?', '5800').toArray();
    expect(assets.length).toBe(1);
    expect(assets[0].make).toBe('Nokia');
    expect(assets[0].model).toBe('5800');
  });

  it('should filter by attribute hash', async ({ db }) => {
    var assets = await db.asset.where({ model: '5800' }).toArray();
    expect(assets.length).toBe(1);
    expect(assets[0].make).toBe('Nokia');
    expect(assets[0].model).toBe('5800');
  });

  it('should combine multiple filters', async ({ db }) => {
    var assets = await db.asset.all().where('model = ?', '5230').where('make = ?', 'Samsung').toArray();
    expect(assets.length).toBe(1);
    expect(assets[0].make).toBe('Samsung');
    expect(assets[0].model).toBe('5230');
  });

  it('should order', async ({ db }) => {
    var assets = await db.asset.all().orderBy('model', '-make').toArray();
    expect(assets.length).toBe(3);
    expect(assets[0].make).toBe('Samsung');
    expect(assets[0].model).toBe('5230');
    expect(assets[1].make).toBe('Nokia');
    expect(assets[1].model).toBe('5230');
    expect(assets[2].make).toBe('Nokia');
    expect(assets[2].model).toBe('5800');
  });

  it('should order case insensitive', async ({ db }) => {
    await db.asset.create({ model: '5230', make: 'panasonic' }).save();

    var assets = await db.asset.all().orderBy('model', '-make').toArray();
    expect(assets.length).toBe(4);
    expect(assets[0].make).toBe('Samsung');
    expect(assets[0].model).toBe('5230');

    expect(assets[1].make).toBe('panasonic');
    expect(assets[1].model).toBe('5230');

    expect(assets[2].make).toBe('Nokia');
    expect(assets[2].model).toBe('5230');

    expect(assets[3].make).toBe('Nokia');
    expect(assets[3].model).toBe('5800');
  });

  it('should destroyAll', async ({ db }) => {
    await db.asset.where('make = ?', 'Nokia').destroyAll();

    var remaining = await db.asset.all().toArray();
    expect(remaining.length).toBe(1);
    expect(remaining[0].make).toBe('Samsung');
  });

  it('should fetch objects with display relationships', async ({ db }) => {
    var building = db.building.create({ name: 'The Building' });
    var room1 = db.room.create({
      barcode: 'R1',
      name: 'Room 1',
      building: building
    });
    var room2 = db.room.create({ barcode: 'R2', name: 'Room 2' });

    await Promise.all([building.save(), room1.save(), room2.save()]);

    // Fetch without display rel
    let rooms = await db.room.all().orderBy('name').toArray();

    expect(rooms.length).toBe(2);
    expect(rooms[0].toString()).toBe(null);
    expect(rooms[1].toString()).toBe(null);

    expect(await rooms[0]._display()).toBe('R1 Room 1 (The Building)');
    expect(await rooms[1]._display()).toBe('R2 Room 2 ()');

    // Fetch with display rel
    rooms = await db.room.all().orderBy('name')._fetchWithDisplay();
    expect(rooms.length).toBe(2);
    expect(rooms[0].toString()).toBe('R1 Room 1 (The Building)');
    expect(rooms[1].toString()).toBe('R2 Room 2 ()');

    // It should not mark the building as dirty
    expect(rooms[0].toData(true)).toEqual({
      id: rooms[0].id,
      type: 'room',
      attributes: {},
      belongs_to: {}
    });
  });

  it('should fetch objects with display relationships that does not exist', async ({ db }) => {
    var building = db.building.create({ name: 'The Building' });
    var room1 = db.room.create({
      barcode: 'R1',
      name: 'Room 1',
      building: building
    });
    var room2 = db.room.create({ barcode: 'R2', name: 'Room 2' });

    await Promise.all([building.save(), room1.save(), room2.save()]);

    await building.destroy();

    var rooms = await db.room.all().orderBy('name')._fetchWithDisplay();
    expect(rooms.length).toBe(2);
    expect(rooms[0].toString()).toBe('R1 Room 1 ()');
    expect(rooms[1].toString()).toBe('R2 Room 2 ()');
    expect(rooms[0].building_id).toBe(building.id);
  });

  it('should fetch objects with display attributes that are empty', async ({ db }) => {
    var building = db.building.create({ name: 'The Building' });
    var room1 = db.room.create({
      barcode: '',
      name: 'Room 1',
      building: building
    });
    var room2 = db.room.create({ barcode: null, name: 'Room 2' });
    var room3 = db.room.create({ name: 'Room 3' });

    await Promise.all([building.save(), room1.save(), room2.save(), room3.save()]);

    var rooms = await db.room.all().orderBy('name')._fetchWithDisplay();
    expect(rooms.length).toBe(3);
    expect(rooms[0].toString()).toBe(' Room 1 (The Building)');
    expect(rooms[1].toString()).toBe(' Room 2 ()');
    expect(rooms[2].toString()).toBe(' Room 3 ()');
  });

  it('should fetch objects with nested preloaded relationships', async ({ db }) => {
    const building = db.building.create({ name: 'The Building' });
    const room1 = db.room.create({
      barcode: 'R1',
      name: 'Room 1',
      building: building
    });
    const room2 = db.room.create({ barcode: 'R2', name: 'Room 2' });
    const asset1 = db.asset.create({ make: 'Test 1', room: room1 });
    const asset2 = db.asset.create({ make: 'Test 2', room: room2 });

    await Promise.all([building.save(), room1.save(), room2.save(), asset1.save(), asset2.save()]);

    // Included nested rel
    const assets = await db.asset
      .where('make starts with ?', 'Test')
      .order_by('make')
      .include('room.building')
      ._fetch();
    expect(assets.length).toBe(2);
    expect(assets[0].toString()).toBe('Test 1  []');
    expect(assets[1].toString()).toBe('Test 2  []');
    const room = assets[0]._cached('room');
    expect(room.name).toBe('Room 1');
    expect(room.id).toBe(room1.id);
    const lbuilding = room._cached('building');
    expect(lbuilding.name).toBe('The Building');
    expect(lbuilding.id).toBe(building.id);
    const lroom2 = assets[1]._cached('room');
    expect(lroom2._cached('building')).toBe(null);

    // It should not mark the room as dirty
    expect(assets[0].toData(true)).toEqual({
      id: assets[0].id,
      type: 'asset',
      attributes: {},
      belongs_to: {}
    });
  });

  it('should render escaped code as literal display text', ({ db }) => {
    // format string for display element: {name} {{$:invalidViewFunction()}}
    //noinspection JSUnresolvedVariable
    const jsReference = db.javascript_function_reference.create({
      name: 'Function 1'
    });
    // Escaped braces preserve the code as literal text.
    expect(jsReference.toString()).toEqual('Function 1 {$:invalidViewFunction()}');
  });

  it('should JSON.stringify() a query', ({ db }) => {
    const query = db.asset.all();
    // Mock a circular reference
    (query as any).adapter = {};
    (query as any).adapter.a = query.adapter;
    const json = JSON.stringify(query);
    // The actual format is not defined - we just test that it doesn't throw an error.
    expect(typeof json).toBe('string');
  });
});
