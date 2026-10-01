import { prettyText, parse } from '@journeyapps/core-xml';
import { FormatStringExpression } from '@journeyapps/evaluator';
import { Version } from '@journeyapps/parser-common';
import { describe, it, expect } from 'vitest';
import { Schema, toDOM } from '../src';

// @ts-ignore
import schema3_xml from './fixtures/schema3.xml?raw';
// @ts-ignore
import expectedOutput from './fixtures/schema_modified.xml?raw';

describe('Schema toDOM', () => {
  it('should output a modified schema', () => {
    const schema = new Schema();
    schema.loadXml(schema3_xml, {
      apiVersion: new Version('4.0'),
      recordSource: true
    });

    const originalDoc = parse(schema3_xml);
    const originalPretty = prettyText(originalDoc);
    const outputText = prettyText(toDOM(schema));

    // Unchanged input should give unchanged output.
    expect(outputText).toEqual(originalPretty);

    // START MODIFICATIONS

    // Add fields
    schema.objects.building.addAttribute(schema.variable('floors', schema.primitive('number')));
    schema.objects.building.addAttribute(schema.variable('height', schema.primitive('number')));
    schema.objects.building.attributes.height.label = 'Height';

    // Delete model
    delete schema.objects.branch;

    // Change label
    schema.objects.worker.attributes.name.label = 'Full Name';

    // Change display
    schema.objects.building.displayFormat = new FormatStringExpression({ expression: 'Updated' });

    // Delete field
    delete schema.objects.room.attributes.name;

    // END MODIFICATIONS

    const modifiedText = prettyText(toDOM(schema));
    expect(modifiedText).toEqual(expectedOutput);
  });
});
