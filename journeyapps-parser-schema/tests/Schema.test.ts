import { Version } from '@ja-platform/parser-common';
import { describe, it, expect } from 'vitest';
import * as blackmontapp_xml from '@ja-platform/core-xml';
import { jsonParser, ObjectType, parseJsonField, parser2, parser3, Schema, TextType } from '../src';

// @ts-ignore
import schema2_xml from './fixtures/schema2.xml?raw';
// @ts-ignore
import schema3_xml from './fixtures/schema3.xml?raw';
// @ts-ignore
import schema3BadgeCountXml from './fixtures/schema3-badge-count.xml?raw';

const v3 = new Version('3.1');
const v2 = new Version('2.0');

describe('json parsing', () => {
  const schema = new Schema();
  it('should parse an object', () => {
    const parser = jsonParser(schema);
    parser.parse({
      objects: {
        asset: {
          label: 'Asset',
          display: 'something',
          attributes: {
            serial: {
              type: 'text',
              label: 'Serial Number',
              spec: 'number'
            },
            colours: {
              type: 'single-choice-integer',
              label: 'Colours',
              options: [
                { value: 0, label: 'Red', index: 1 },
                { value: 3, label: 'Green', index: 0 }
              ]
            }
          },
          belongsTo: {
            container: {
              type: 'room',
              foreignName: 'assets'
            }
          }
        },
        room: {
          label: 'Room',
          display: 'Something',
          attributes: {},
          belongsTo: {}
        }
      }
    });

    const asset = schema.objects.asset;
    const room = schema.objects.room;

    expect(asset.label).toBe('Asset');
    expect(asset.attributes.serial.type.spec).toBe('number');
    expect(asset.attributes.colours.type.options[3].label).toBe('Green');
    expect(asset.attributes.colours.type.options[0].index).toBe(1);
    expect(asset.attributes.colours.type.options[3].index).toBe(0);

    const rel = asset.belongsTo.container;
    expect(rel.objectType).toBe(asset);
    expect(rel.foreignType).toBe(room);
    expect(rel.foreignName).toEqual('assets');
    expect(rel.type).toEqual('one-to-many');

    expect(room.hasMany.assets).toBe(rel);
  });

  it('should parse a field', () => {
    const field = parseJsonField(schema, {
      name: 'serial_number',
      type: 'text',
      label: 'Serial Number',
      spec: 'number',
      subType: 'signed-number'
    });

    expect(field.name).toBe('serial_number');
    expect(field.type.name).toBe('text');
    expect(field.type.spec).toBe('number');
    expect(field.type.subType).toBe('signed-number');

    // TODO: test options
  });

  it('should parse a date field', () => {
    let field = parseJsonField(schema, {
      name: 'day',
      type: 'date'
    });

    expect(field.name).toBe('day');
    expect(field.type.name).toBe('date');
    expect(field.type.isDay).toBe(false);

    expect(field.toJSON()).toEqual({ name: 'day', type: 'date' });
  });

  it('should parse a date field (isDay: true)', () => {
    let field = parseJsonField(schema, {
      name: 'day',
      type: 'date',
      isDay: true
    });

    expect(field.name).toBe('day');
    expect(field.type.name).toBe('date');
    expect(field.type.isDay).toBe(true);
    expect(field.toJSON()).toEqual({ name: 'day', type: 'date', isDay: true });
  });

  it('should parse a date field (isDay: false)', () => {
    let field = parseJsonField(schema, {
      name: 'day',
      type: 'date',
      isDay: false
    });

    expect(field.name).toBe('day');
    expect(field.type.name).toBe('date');
    expect(field.type.isDay).toBe(false);
    expect(field.toJSON()).toEqual({ name: 'day', type: 'date' });
  });
});

describe('xml schema parsing (domparser)', () => {
  function xml(text: string) {
    return blackmontapp_xml.parse(text).documentElement;
  }

  it('should load a v2 string attribute', () => {
    const attr = parser2(new Schema()).parseField(
      xml('<attribute name="serial_number" label="Serial Number" type="string" spec="text.name"/>')
    );
    expect(attr.name).toBe('serial_number');
    expect(attr.label).toBe('Serial Number');
    expect(attr.type.name).toEqual('text');
    expect(attr.type.spec).toEqual('text.name');
  });

  it('should load a v3 string attribute', () => {
    const attr = parser3(new Schema()).parseField(
      xml('<field name="serial_number" label="Serial Number" type="text:name" />')
    );
    expect(attr.name).toBe('serial_number');
    expect(attr.label).toBe('Serial Number');
    expect(attr.type.name).toEqual('text');
    expect(attr.type.spec).toEqual('text.name');
    expect(attr.type.subType).toEqual('name');
  });

  it('should load an enum attribute', () => {
    const attr = parser2(new Schema()).parseField(
      xml(
        '<attribute name="colours" label="Colours" type="enum">' +
          '<option>Red</option>' +
          '<option>Green</option>' +
          '<option>Blue</option>' +
          '<option>Black</option>' +
          '<option>Yellow</option>' +
          '<option>Purple</option>' +
          '<option>Brown</option>' +
          '<option>Pink</option>' +
          '<option>Grey</option>' +
          '<option>White</option>' +
          '<option>Magenta</option>' +
          '</attribute>'
      )
    );
    expect(attr.type.name).toEqual('single-choice-integer');
    expect(attr.type.hasOptions).toBe(true);
    expect(attr.type.multipleOptions).toBe(false);
    expect(Object.keys(attr.type.options).length).toEqual(11);
    expect(attr.type.options[0].label).toEqual('Red');
    expect(attr.type.options[0].index).toEqual(0);
    expect(attr.type.options[1].label).toEqual('Green');
    expect(attr.type.options[1].index).toEqual(1);
    expect(attr.type.options[2].label).toEqual('Blue');
    expect(attr.type.options[2].index).toEqual(2);
    expect(attr.type.options[9].label).toEqual('White');
    expect(attr.type.options[9].index).toEqual(9);
    expect(attr.type.options[10].label).toEqual('Magenta');
    expect(attr.type.options[10].index).toEqual(10);

    // Confirm ordering
    expect(Object.keys(attr.type.options)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  it('should load a single-choice attribute', () => {
    const attr = parser3(new Schema()).parseField(
      xml(
        '<field name="colours" label="Colours" type="single-choice">' +
          '<option key="red">Red</option>' +
          '<option key="green">Green</option>' +
          '<option key="blue">Blue</option>' +
          '<option key="black">Black</option>' +
          '<option key="yellow">Yellow</option>' +
          '<option key="purple">Purple</option>' +
          '<option key="brown">Brown</option>' +
          '<option key="pink">Pink</option>' +
          '<option key="grey">Grey</option>' +
          '<option key="white">White</option>' +
          '<option key="magenta">Magenta</option>' +
          '</field>'
      )
    );
    expect(attr.type.name).toEqual('single-choice');
    expect(attr.type.hasOptions).toBe(true);
    expect(attr.type.multipleOptions).toBe(false);
    expect(Object.keys(attr.type.options).length).toEqual(11);
    expect(attr.type.options.red.label).toEqual('Red');
    expect(attr.type.options.red.index).toEqual(0);
    expect(attr.type.options.green.label).toEqual('Green');
    expect(attr.type.options.green.index).toEqual(1);
    expect(attr.type.options.blue.label).toEqual('Blue');
    expect(attr.type.options.blue.index).toEqual(2);

    // Confirm ordering
    expect(Object.keys(attr.type.options)).toEqual([
      'red',
      'green',
      'blue',
      'black',
      'yellow',
      'purple',
      'brown',
      'pink',
      'grey',
      'white',
      'magenta'
    ]);

    expect(attr.type.toJSON().options).toEqual([
      { value: 'red', label: 'Red', index: 0 },
      { value: 'green', label: 'Green', index: 1 },
      { value: 'blue', label: 'Blue', index: 2 },
      { value: 'black', label: 'Black', index: 3 },
      { value: 'yellow', label: 'Yellow', index: 4 },
      { value: 'purple', label: 'Purple', index: 5 },
      { value: 'brown', label: 'Brown', index: 6 },
      { value: 'pink', label: 'Pink', index: 7 },
      { value: 'grey', label: 'Grey', index: 8 },
      { value: 'white', label: 'White', index: 9 },
      { value: 'magenta', label: 'Magenta', index: 10 }
    ]);
  });

  it('should load a boolean attribute', () => {
    const attr = parser3(new Schema()).parseField(
      xml(
        '<field name="confirm" label="Confirm" type="boolean">' +
          '<option key="true">OK</option>' +
          '<option key="false">Cancel</option>' +
          '</field>'
      )
    );
    expect(attr.type.name).toEqual('boolean');
    expect(attr.type.hasOptions).toBe(true);
    expect(attr.type.multipleOptions).toBe(false);
    expect(Object.keys(attr.type.options)).toEqual(['true', 'false']);
    expect(attr.type.options['true'].label).toEqual('OK');
    expect(attr.type.options['true'].value).toEqual(true);
    expect(attr.type.options['true'].index).toEqual(0);
    expect(attr.type.options['false'].label).toEqual('Cancel');
    expect(attr.type.options['false'].value).toEqual(false);
    expect(attr.type.options['false'].index).toEqual(1);
  });

  it('should load a boolean attribute with defaults', () => {
    const attr = parser3(new Schema()).parseField(xml('<field name="confirm" label="Confirm" type="boolean"/>'));
    expect(attr.type.name).toEqual('boolean');
    expect(attr.type.hasOptions).toBe(true);
    expect(attr.type.multipleOptions).toBe(false);
    expect(Object.keys(attr.type.options)).toEqual(['false', 'true']);
    expect(attr.type.options['true'].label).toEqual('Yes');
    expect(attr.type.options['true'].index).toEqual(1);
    expect(attr.type.options['false'].label).toEqual('No');
    expect(attr.type.options['false'].index).toEqual(0); // false defaults to first element
  });

  it('should load a multiple-choice attribute', () => {
    const attr = parser3(new Schema()).parseField(
      xml(
        '<field name="colours" label="Colours" type="multiple-choice">' +
          '<option key="red">Red</option>' +
          '<option key="green">Green</option>' +
          '<option key="blue">Blue</option>' +
          '</field>'
      )
    );
    expect(attr.type.name).toEqual('multiple-choice');
    expect(attr.type.hasOptions).toBe(true);
    expect(attr.type.multipleOptions).toBe(true);
    expect(Object.keys(attr.type.options).length).toEqual(3);
    expect(attr.type.options.red.label).toEqual('Red');
    expect(attr.type.options.red.index).toEqual(0);
    expect(attr.type.options.green.label).toEqual('Green');
    expect(attr.type.options.green.index).toEqual(1);
    expect(attr.type.options.blue.label).toEqual('Blue');
    expect(attr.type.options.blue.index).toEqual(2);
  });

  it('should load a multiple-choice-integer attribute', () => {
    const attr = parser3(new Schema()).parseField(
      xml(
        '<field name="colours" label="Colours" type="multiple-choice-integer">' +
          '<option key="1">Red</option>' +
          '<option key="3">Green</option>' +
          '<option>Blue</option>' +
          '</field>'
      )
    );
    expect(attr.type.name).toEqual('multiple-choice-integer');
    expect(attr.type.hasOptions).toBe(true);
    expect(attr.type.multipleOptions).toBe(true);
    expect(Object.keys(attr.type.options).length).toEqual(3);
    expect(attr.type.options[1].label).toEqual('Red');
    expect(attr.type.options[1].index).toEqual(0);
    expect(attr.type.options[3].label).toEqual('Green');
    expect(attr.type.options[3].index).toEqual(1);
    expect(attr.type.options[4].label).toEqual('Blue');
    expect(attr.type.options[4].index).toEqual(2);
  });

  it('should load an object', () => {
    const assetType = parser2(new Schema()).parseObjectType(
      xml(
        '<object name="asset" label="Asset">' +
          '<attribute name="serial_number" label="Serial Number" type="string" />' +
          '<display format="{make} {model} [{serial_number}]" />' +
          '</object>'
      )
    );

    expect(assetType.name).toBe('asset');
    expect(assetType.label).toBe('Asset');

    const serial = assetType.getVariable('serial_number');
    expect(serial).not.toEqual(null);
    expect(serial.name).toEqual('serial_number');
    expect(serial.label).toEqual('Serial Number');
    expect(TextType.isInstanceOf(serial.type)).toBe(true);
  });

  ['2', '3'].forEach((v) => {
    it('should load a v' + v + ' schema from an xml string', () => {
      let s;
      if (v == '2') {
        s = new Schema().loadXml(schema2_xml, { apiVersion: v2 });
      } else if (v == '3') {
        s = new Schema().loadXml(schema3_xml, { apiVersion: v3 });
      }

      expect(s.errors).toEqual([]);

      const assetType = s.getType('asset');
      expect(assetType).not.toEqual(null);
      expect(assetType.label).toBe('Asset');

      expect(assetType.indexes).toEqual([
        { on: ['worker'], name: 'owner', databases: ['app', 'cloud'], keys: [{ field: 'worker', dir: 1 }] },
        {
          on: ['make', 'model'],
          name: 'make_model',
          databases: ['app', 'cloud'],
          keys: [
            { field: 'make', dir: 1 },
            { field: 'model', dir: 1 }
          ]
        }
      ]);

      const roomType = s.getType('room');
      expect(roomType).not.toEqual(null);

      const rel = assetType.belongsTo.room;
      expect(rel).not.toEqual(null);
      expect(rel.name).toEqual('room');
      expect(rel.objectType).toEqual(assetType);
      expect(rel.foreignType).toEqual(roomType);
      expect(rel.foreignName).toEqual('assets');
      expect(rel.type).toEqual('one-to-many');

      expect(roomType.hasMany.assets).toBe(rel);

      const roomAttr = assetType.getAttribute('room');
      expect(roomAttr.name).toBe('room');
      expect(roomAttr.type.name).toBe('room');
      expect(roomAttr.relationship).toBe('room');

      const roomIdAttr = assetType.getAttribute('room_id');
      expect(roomIdAttr.name).toBe('room_id');
      expect(roomIdAttr.type.name).toBe('text');
      expect(roomIdAttr.relationship).toBe('room');

      const assetsAttr = roomType.getAttribute('assets');
      expect(assetsAttr.name).toBe('assets');
      expect(assetsAttr.type.name).toBe('query');
      expect(assetsAttr.type.objectType.name).toBe('asset');

      const photoAttr = assetType.getAttribute('photo');
      expect(photoAttr.type.media).toBe('image/jpeg');
      if (v == '3') {
        expect(photoAttr.type.autoDownload).toBe(true);
      }

      const signatureAttr = assetType.getAttribute('tnc_signature');
      expect(signatureAttr.type.media).toBe('image/svg+xml');
      if (v == '3') {
        expect(signatureAttr.type.autoDownload).toBe(false);
      }

      const attributeKeys = Object.keys(roomType.getAttributes()).sort();
      expect(attributeKeys).toEqual([
        'assets',
        'barcode',
        'building',
        'building_id',
        'id',
        'name',
        'personnel',
        'personnel_id'
      ]);

      const barcodeAttr = assetType.getAttribute('barcode');
      expect(barcodeAttr.type.spec).toBe('text.email');
    });
  });

  it('should load a notify-user definition for a model', () => {
    const s = new Schema().loadXml(schema3_xml, { apiVersion: v3 });

    expect(s.errors).toEqual([]);

    const workerType = s.getType('worker');
    expect(workerType).not.toEqual(null); // sanity check

    const notification = s.getType('order_notification');
    expect(notification).not.toEqual(null); // sanity check
    expect(notification.notifyUsers).not.toEqual(null);
    expect(notification.notifyUsers.length).toEqual(1);
    expect(notification.notifyUsers[0].message).not.toEqual(null);
    expect(notification.notifyUsers[0].received).toEqual('received_at');
    expect(notification.notifyUsers[0].recipient).toEqual('worker');
    expect(notification.notifyUsers[0].badgeCount).toEqual(null);
  });

  it('should a notify-user definition for a model with badge count', () => {
    const s = new Schema().loadXml(schema3BadgeCountXml, { apiVersion: v3 });

    expect(s.errors).toEqual([]);

    const workerType = s.getType('worker') as ObjectType;
    expect(workerType).not.toEqual(null); // sanity check

    const notification = s.getType('order_notification') as ObjectType;
    expect(notification).not.toEqual(null); // sanity check
    expect(notification.notifyUsers).not.toEqual(null);
    expect(notification.notifyUsers.length).toEqual(1);
    expect(notification.notifyUsers[0].message).not.toEqual(null);
    expect(notification.notifyUsers[0].received).toEqual('received_at');
    expect(notification.notifyUsers[0].recipient).toEqual('worker');
    expect(notification.notifyUsers[0].badgeCount).toEqual('badge_count');
  });

  it('should load a ready webhook definition for a model', () => {
    const s = new Schema().loadXml(schema3_xml, { apiVersion: v3 });

    expect(s.errors).toEqual([]);

    const assetType = s.getType('asset') as ObjectType;
    expect(assetType).not.toEqual(null); // sanity check

    expect(assetType.webhooks).not.toEqual(null);
    expect(assetType.webhooks.length).toEqual(2);

    // first webhook for asset model
    let webhook = assetType.webhooks[0];
    expect(webhook).not.toEqual(null);
    expect(webhook.type).toEqual('ready');
    expect(webhook.name).toEqual('ready_asset');
    expect(webhook.fields).not.toEqual(null);
    expect(webhook.fields.length).toEqual(3);

    let webhookField = webhook.fields[0];
    expect(webhookField).not.toEqual(null);
    expect(webhookField.name).toEqual('room');
    expect(webhookField.embed).toEqual(true);
    expect(webhookField.required).toEqual(true); // default value

    webhookField = webhook.fields[1];
    expect(webhookField).not.toEqual(null);
    expect(webhookField.name).toEqual('photo');
    expect(webhookField.embed).toEqual(true); // default value
    expect(webhookField.required).toEqual(false);
    expect(webhookField.state).toEqual('present'); // default value

    webhookField = webhook.fields[2];
    expect(webhookField).not.toEqual(null);
    expect(webhookField.name).toEqual('tnc_signature');
    expect(webhookField.embed).toEqual(false);
    expect(webhookField.required).toEqual(true);
    expect(webhookField.state).toEqual('uploaded');

    // second webhook for asset model
    webhook = assetType.webhooks[1];
    expect(webhook).not.toEqual(null);
    expect(webhook.type).toEqual('ready');
    expect(webhook.name).toEqual('ready_asset2');

    expect(webhook.fields).not.toEqual(null);
    expect(webhook.fields.length).toEqual(0);
  });

  it('should load an update webhook definition for a model', () => {
    const s = new Schema().loadXml(schema3_xml, { apiVersion: v3 });

    expect(s.errors).toEqual([]);

    const roomType = s.getType('room') as ObjectType;
    expect(roomType).not.toEqual(null); // sanity check

    expect(roomType.webhooks).not.toEqual(null);
    expect(roomType.webhooks.length).toEqual(1);

    const webhook = roomType.webhooks[0];
    expect(webhook).not.toEqual(null);
    expect(webhook.type).toEqual('update');
    expect(webhook.name).toEqual('update_room');

    expect(webhook.fields).not.toEqual(null);
    expect(webhook.fields.length).toEqual(0);
  });

  it('should load a webhook with an explicit receiver', () => {
    const s = new Schema().loadXml(schema3_xml, { apiVersion: v3 });
    expect(s.errors).toEqual([]);

    const part = s.getType('part') as ObjectType;
    expect(part).not.toEqual(null); // sanity check

    expect(part.webhooks).not.toEqual(null);
    expect(part.webhooks.length).toEqual(4);

    expect(part.webhooks[0].name).toEqual('cloudcode_part_ready_helloworld');
    expect(part.webhooks[1].name).toEqual('pdfmailer_part_update_helloworld');
    expect(part.webhooks[2].name).toEqual('cloudcode_part_update_helloworld');
    expect(part.webhooks[3].name).toEqual('overridden_name');
  });

  it('should give helpful errors for webhooks', () => {
    let f;
    function schema_for(wh_def) {
      const x =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<data-model>\n' +
        '  <model name="worker" label="Worker">\n' +
        '    <field name="name" label="Name" type="text" />\n' +
        '    <display>{name}</display>\n' +
        '    ' +
        wh_def +
        '\n' +
        '  </model>\n' +
        '</data-model>\n';

      const s = new Schema().loadXml(x, { apiVersion: v3 });

      return {
        schema: s,
        hook: (s.getType('worker') as ObjectType).webhooks[0],
        errors: s.errors.map((e) => e.message)
      };
    }

    f = schema_for('<webhook type="ready" receiver="hello" action="world"/>');
    expect(f.errors).toContain('webhook receiver must be "cloudcode" or "pdfmailer" when specified');

    f = schema_for('<webhook type="ready" />');
    expect(f.errors).toEqual([]);

    f = schema_for('<webhook type="update" receiver="cloudcode" />');
    expect(f.errors).toContain('webhook action required when receiver is specified');

    f = schema_for('<webhook type="update" receiver="cloudcode" action="" />');
    expect(f.errors).toContain('webhook action required when receiver is specified');

    f = schema_for('<webhook type="update" action="hello" />');
    expect(f.errors).toContain('webhook action is not allowed unless receiver is specified');

    f = schema_for('<webhook type="update" receiver="pdfmailer" action="hello" />');
    expect(f.errors).toEqual([]);

    f = schema_for('<webhook type="update" receiver="pdfmailer" action="hello" name="helloWorld" />');
    expect(f.errors).toEqual([]);

    f = schema_for('<webhook type="update" receiver="cloudcode" action="hello" />');
    expect(f.errors).toEqual([]);
  });
});
