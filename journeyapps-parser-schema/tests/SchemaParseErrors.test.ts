import { Version } from '@ja-platform/parser-common';
import { describe, it, expect, beforeEach } from 'vitest';
import * as blackmontapp_xml from '@ja-platform/core-xml';
import { parser2, Schema } from '../src';

const v3 = new Version('3.1');
const v2 = new Version('2.0');

declare module 'vitest' {
  export interface TestContext {
    skipErrorPositions: boolean;
  }
}

describe('xml schema parsing errors', () => {
  beforeEach((context) => {
    context.skipErrorPositions = typeof window == 'object';
  });

  function xml(text: string) {
    return blackmontapp_xml.parse(text).documentElement;
  }

  function parseSchema(text, options?) {
    return new Schema().loadXml(text, options);
  }

  it('should report an error when the root element is not <schema>', () => {
    const schema = parseSchema('<somethingelse></somethingelse>', {
      apiVersion: v2
    });

    expect(schema.errors).toMatchObject([
      {
        message: '<schema> root tag expected',
        type: 'error'
      }
    ]);
  });

  it('should report an error when the root element is not <data-model> in v3 schema', () => {
    const schema = parseSchema('<somethingelse></somethingelse>', {
      apiVersion: v3
    });
    expect(schema.errors).toMatchObject([
      {
        message: '<data-model> root tag expected',
        type: 'error'
      }
    ]);
  });

  it('should report a warning when there are children other than <object>', () => {
    const schema = parseSchema(
      '<schema><object name="test" label="Test"><display format="Test" /></object><somechild /></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Invalid element 'somechild'",
        type: 'warning'
      }
    ]);
  });

  it('should require at least one object type', () => {
    const schema = parseSchema('<schema></schema>');
    expect(schema.errors).toMatchObject([
      {
        message: 'At least one model is required',
        type: 'error'
      }
    ]);
  });

  it('should validate the order of elements in <object>', () => {
    const schema = parseSchema(
      '<schema><object name="test" label="Test"><display format="Test" /><attribute name="t" type="string" label="T" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: 'Elements must be in this order: attributes, relationships, display, notify-user, indices, webhooks',
        type: 'error'
      }
    ]);
  });

  it('should require a display element', () => {
    const schema = parseSchema('<schema><object name="test" label="Test"></object></schema>');
    expect(schema.errors).toMatchObject([
      {
        message: '<display> is required',
        type: 'error'
      }
    ]);
  });

  it('should not allow more than one display element', () => {
    const schema = parseSchema(
      '<schema><object name="test" label="Test"><display format="Test" /><display format="Test" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: 'Only one <display> element is allowed',
        type: 'warning'
      }
    ]);
  });

  it('should validate <display> attributes', () => {
    const schema = parseSchema(
      '<schema><object name="test" label="Test"><display something="wrong" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Invalid attribute 'something'",
        type: 'warning'
      }
    ]);
  });

  it('should validate that an <object> element has no other children', () => {
    const schema = parseSchema(
      '<schema><object name="test" label="Test"><somethingelse /> <display format="Test" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Invalid element 'somethingelse'",
        type: 'warning'
      }
    ]);
  });

  it('should validate attributes on <object> elements', () => {
    const schema = parseSchema(
      '<schema><object something="invalid" label=""><display format="Test" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Invalid attribute 'something'",
        type: 'warning'
      },
      {
        message: 'name is required',
        type: 'error'
      }
    ]);
  });

  it('should validate attribute types', () => {
    const schema = parseSchema(
      '<schema><object name="test" label="Test">\n<attribute name="t" type="somethingelse" label="Test" />\n<display format="Test" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Invalid type 'somethingelse'",
        type: 'error'
      }
    ]);
  });

  it('should not allow pure v2 attribute types in v3 schema', () => {
    const schema = parseSchema(
      '<data-model><model name="test" label="Test">\n<field name="t" type="string" label="Test" />\n<display format="Test" /></model></data-model>',
      { apiVersion: v3 }
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Invalid type 'string'",
        type: 'error'
      }
    ]);
  });

  it('should validate a missing attribute type', () => {
    const schema = parseSchema(
      '<schema><object name="test" label="Test">\n<attribute name="t" label="Test" />\n<display format="Test" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: 'type is required',
        type: 'error'
      }
    ]);
  });

  it('should validate attachment media in v2 schema', () => {
    const schema = parseSchema(
      '<schema><object name="test" label="Test">\n<attribute name="t" type="attachment" media="application/octet-stream" label="Test"/>\n<display format="Test" /></object></schema>',
      { apiVersion: v2 }
    );
    expect(schema.errors).toMatchObject([
      {
        message: "media must be 'any', or one of the specific allowed mime types.",
        type: 'error'
      }
    ]);
  });

  it('should validate attachment media in v3 schema', () => {
    const schema = parseSchema(
      '<data-model><model name="test" label="Test">\n<field name="t" type="attachment" media="application/octet-stream" label="Test"/>\n<display format="Test" /></model></data-model>',
      { apiVersion: v3 }
    );
    expect(schema.errors).toMatchObject([
      {
        message: "media must be 'any', or one of the specific allowed mime types.",
        type: 'error'
      }
    ]);
  });

  it('should allow not blank attachment media in v3 schema', () => {
    const schema = parseSchema(
      '<data-model><model name="test" label="Test">\n<field name="t" type="attachment" label="Test"/>\n<display format="Test" /></model></data-model>',
      { apiVersion: v3 }
    );
    expect(schema.errors).toMatchObject([
      {
        message: 'Include media="" with a specific mime type, or media="any" for any of the allowed types.',
        type: 'error'
      }
    ]);
  });

  it('should handle broken xml', () => {
    const schema = parseSchema('<schema broken></schema>');
    expect(schema.errors.length).toBe(1);
  });

  it('should error on duplicate object names', ({ skipErrorPositions }) => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test"><display format="Test" /></object>\n<object name="test" label="Test"><display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Model 'test' is already defined",
        type: 'error',
        start: skipErrorPositions ? undefined : { line: 2, column: 14 }
      }
    ]);
  });

  it('should error on an unknown string spec', ({ skipErrorPositions }) => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<attribute spec="text.whatisthis" name="t" type="string" label="test"/>\n<display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: 'Invalid spec',
        type: 'error',
        start: skipErrorPositions ? undefined : { line: 2, column: 17 }
      }
    ]);
  });

  it('should error on an unknown string format', ({ skipErrorPositions }) => {
    const schema = parseSchema(
      '<data-model>\n<model name="test" label="Test">\n<field name="t" type="text:whatisthis" label="test"/>\n<display format="Test" /></model></data-model>',
      { apiVersion: v3 }
    );

    expect(schema.errors).toMatchObject([
      {
        message: "'whatisthis' is not a valid string format",
        type: 'error',
        start: skipErrorPositions ? undefined : { line: 2, column: 22 }
      }
    ]);
  });

  it('should validate object names', () => {
    const schema = parseSchema(
      '<schema>\n<object name="my test" label="Test"><display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: 'Not a valid name',
        type: 'error'
      }
    ]);
  });

  it('should report an error for reserved object names', () => {
    const schema = parseSchema(
      '<schema><object name="account" label="Account"><display format="Test" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Reserved model name 'account'",
        type: 'error'
      }
    ]);
  });

  it('should error on duplicate attribute names', ({ skipErrorPositions }) => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test"><attribute name="t" type="string" label="Test" />\n<attribute name="t" type="string" label="Test" /><display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Attribute 't' is already defined",
        type: 'error',
        start: skipErrorPositions ? undefined : { line: 2, column: 17 }
      }
    ]);
  });

  it('should validate belongs_to attributes', () => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<belongs_to something="wrong" /><display format="Test" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Invalid attribute 'something'",
        type: 'warning'
      },
      {
        message: 'type is required',
        type: 'error'
      }
    ]);
  });

  it('should error on an invalid belongs_to', ({ skipErrorPositions }) => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<belongs_to type="another" /><display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Object 'another' is not defined",
        type: 'error',
        start: skipErrorPositions ? undefined : { line: 2, column: 18 }
      }
    ]);
  });

  it('should error on an belongs_to with pure v3 syntax', () => {
    const schema = parseSchema(
      '<data-model>\n<model name="test" label="Test">\n<belongs_to type="test" /><display format="Test" /></model></data-model>',
      { apiVersion: v3 }
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Invalid element 'belongs_to'",
        type: 'warning'
      }
    ]);
  });

  it('should validate has_many attributes', () => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<has_many something="wrong" /><display format="Test" /></object></schema>'
    );
    expect(schema.errors).toMatchObject([
      {
        message: "Invalid attribute 'something'",
        type: 'warning'
      },
      {
        message: 'name is required',
        type: 'error'
      },
      {
        message: 'type is required',
        type: 'error'
      }
    ]);
  });

  it('should error on an invalid has_many', () => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<has_many name="others" type="another" /><display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Object 'another' is not defined",
        type: 'error'
      }
    ]);
  });

  it('should error on an has_many without belongs_to', () => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<has_many name="others" type="test" /><display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: 'Need <belongs_to type="test"> in object \'test\'',
        type: 'error'
      }
    ]);
  });

  it('should error on an has_many with multiple belongs_to', () => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<belongs_to name="one" type="test" /><belongs_to name="two" type="test" /><has_many name="others" type="test" /><display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: 'Ambiguous has_many - set inverse_of to one of one, two',
        type: 'error'
      }
    ]);
  });

  it('should error on an has_many with invalid inverse_of', () => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<has_many name="others" type="test" inverse_of="something" /><display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: "'something' is not defined on 'test'",
        type: 'error'
      }
    ]);
  });

  it('should error on an has-many with invalid v3 inverse-of', () => {
    const schema = parseSchema(
      '<data-model>\n<model name="test" label="Test">\n<has-many name="others" model="test" inverse-of="something" /><display format="Test" /></model></data-model>',
      { apiVersion: v3 }
    );

    expect(schema.errors).toMatchObject([
      {
        message: "'something' is not defined on 'test'",
        type: 'error'
      }
    ]);
  });

  it('should not allow inverse_of on a v3 has-many', () => {
    const schema = parseSchema(
      '<data-model>\n<model name="test" label="Test">\n<has-many name="others" model="test" inverse_of="something" /><display format="Test" /></model></data-model>',
      { apiVersion: v3 }
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Invalid attribute 'inverse_of'",
        type: 'warning'
      },
      {
        message: 'Need <belongs-to model="test"> in object \'test\'',
        type: 'error'
      }
    ]);
  });

  it('should error on duplicate belongs_to names', ({ skipErrorPositions }) => {
    const schema = parseSchema(
      '<schema>\n<object name="test" label="Test">\n<belongs_to type="test" name="test1" />\n<belongs_to name="test1" type="test" />\n<display format="Test" /></object></schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Relationship 'test1' is already defined",
        type: 'error',
        start: skipErrorPositions ? undefined : { line: 3, column: 18 }
      }
    ]);
  });

  it('should error on duplicate has_many names', () => {
    const schema = parseSchema(
      '<schema>\n' +
        '<object name="test" label="Test">\n<belongs_to type="other" name="a" />\n<belongs_to name="b" type="other" />\n<display format="Test" /></object>' +
        '<object name="other" label="O">\n<has_many type="test" name="tt" inverse_of="a" />\n<has_many type="test" name="tt" inverse_of="b" />\n<display format="Test" /></object>' +
        '</schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Relationship 'tt' is already defined",
        type: 'error'
      }
    ]);
  });

  it('should error on duplicate has_many', () => {
    const schema = parseSchema(
      '<schema>\n' +
        '<object name="test" label="Test">\n<belongs_to type="other" name="a" />\n<display format="Test" /></object>' +
        '<object name="other" label="O">\n<has_many type="test" name="t1" />\n<has_many type="test" name="t2" />\n<display format="Test" /></object>' +
        '</schema>',
      false
      // { v2syntax: true }
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Relationship 'a' already has a has_many 't1'",
        type: 'error'
      }
    ]);
  });

  it('should not allow anything other than <option> in an enum element', () => {
    const parser = parser2(new Schema());
    const attr = parser.parseField(
      xml(
        '<attribute name="colours" label="Colours" type="enum">' +
          '<option>Red</option>' +
          '<option>Green</option>' +
          '<option>Blue</option>' +
          'Some text' +
          '<somethingelse />' +
          '</attribute>'
      ),
      false
      // { v2syntax: true }
    );

    expect(attr.type.name).toEqual('single-choice-integer');
    expect(Object.keys(attr.type.options).length).toEqual(3);
    expect(attr.type.options[0].label).toEqual('Red');

    expect(parser.getErrors()).toMatchObject([
      {
        message: 'Text is not allowed inside this element',
        type: 'warning'
      },
      { message: "Invalid element 'somethingelse'", type: 'warning' }
    ]);
  });

  it('should not allow anything in a normal attribute element', () => {
    const parser = parser2(new Schema());
    const attr = parser.parseField(
      xml(
        '<attribute name="colours" label="Colours" type="string">' +
          '<option>Red</option>' +
          'Some text' +
          '</attribute>'
      ),
      false
      // { v2syntax: true }
    );

    expect(attr.type.name).toEqual('text');

    expect(parser.getErrors()).toMatchObject([
      { message: "Invalid element 'option'", type: 'warning' },
      {
        message: 'Text is not allowed inside this element',
        type: 'warning'
      }
    ]);
  });

  it('should validate an attribute name', () => {
    const parser = parser2(new Schema());
    const attr = parser.parseField(
      xml('<attribute name="my colour" label="My Colour" type="string"/>'),
      false
      // { v2syntax: true }
    );

    expect(attr.type.name).toEqual('text');

    expect(parser.getErrors()).toMatchObject([
      {
        message: 'Not a valid name',
        type: 'error'
      }
    ]);
  });

  it('should report an error for reserved attribute names', () => {
    const parser = parser2(new Schema());
    const attr = parser.parseField(
      xml('<attribute name="id" label="My Colour" type="string"/>'),
      false
      // { v2syntax: true }
    );

    expect(attr.type.name).toEqual('text');

    expect(parser.getErrors()).toMatchObject([
      {
        message: "Reserved field name 'id'",
        type: 'error'
      }
    ]);
  });

  it('should warn for bad attribute names', () => {
    const parser = parser2(new Schema());
    const attr = parser.parseField(
      xml('<attribute name="document_id" label="Document ID" type="string"/>'),
      false
      // { v2syntax: true }
    );

    expect(attr.type.name).toEqual('text');

    expect(parser.getErrors()).toMatchObject([
      {
        message: "Field name should not end with '_id'",
        type: 'warning'
      }
    ]);
  });

  it('should report an error for invalid webhook types', () => {
    const schema = parseSchema(
      '<schema>\n<object label="Test" name="test"><display format="Test" /><webhook type="invalid" name="invalid_webhook"></webhook></object>\n</schema>'
    );

    expect(schema.errors).toMatchObject([
      {
        message: 'webhook type must be "ready" or "update"',
        type: 'error'
      }
    ]);
  });

  it('should error for index on fields that are not indexable', () => {
    const schema = parseSchema(
      '<data-model>\n<model label="Test" name="test"><field name="mugshot" label="Mugshot" type="photo"/><display format="Test" /><index on="mugshot"/></model>\n</data-model>',
      { apiVersion: v3 }
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Field is not indexable: 'mugshot'",
        type: 'error'
      }
    ]);
  });

  it('should error for index on undefined fields', () => {
    const schema = parseSchema(
      '<data-model>\n<model label="Test" name="test"><display format="Test" /><index on="wtf"/></model>\n</data-model>',
      { apiVersion: v3 }
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Undefined field or model in index: 'wtf'",
        type: 'error'
      }
    ]);
  });

  it('should error for index on undefined fields when multiple are specified', () => {
    const schema = parseSchema(
      '<data-model>\n<model label="Test" name="test"><field name="name" label="Name" type="text"/><display format="Test" /><index on="name,wtf"/></model>\n</data-model>',
      { apiVersion: v3 }
    );

    expect(schema.errors).toMatchObject([
      {
        message: "Undefined field or model in index: 'wtf'",
        type: 'error'
      }
    ]);
  });
});
