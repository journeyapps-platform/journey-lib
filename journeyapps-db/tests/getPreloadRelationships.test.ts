import { describe, it, expect, beforeEach } from 'vitest';
import { FormatStringExpression } from '@ja-platform/evaluator';
import {
  Schema,
  SchemaModelType,
  SchemaObjectDisplayExpression,
  Variable,
  parser2 as schemaParserV2
} from '@ja-platform/parser-schema';
import { parse as parseXML } from '@ja-platform/core-xml';
import { getPreloadRelationships } from '../src/query/getPreloadRelationships';

describe('getPreloadRelationships', () => {
  let schema: Schema;
  let personType: SchemaModelType;
  let companyType: SchemaModelType;

  beforeEach(() => {
    schema = new Schema();
    const categoryType = schema.newObjectType('category');
    categoryType.addAttribute(schema.variable('name', 'text'));
    categoryType.displayFormat = SchemaObjectDisplayExpression.parse('{name}');

    companyType = schema.newObjectType('company');
    companyType.addAttribute(schema.variable('name', 'text'));
    companyType.addAttribute(new Variable('category', categoryType));
    companyType.displayFormat = SchemaObjectDisplayExpression.parse('{name} {category}');

    personType = schema.newObjectType('person');
    personType.addAttribute(schema.variable('name', 'text'));
    personType.addAttribute(schema.variable('surname', 'text'));
    personType.addAttribute(new Variable('company', companyType));
    personType.displayFormat = SchemaObjectDisplayExpression.parse('{name}');
  });

  it('should extract an empty relationship structure', () => {
    const fs = FormatStringExpression.parse('{name}');
    expect(getPreloadRelationships(personType, [fs])).toEqual({});
  });

  it('should extract a simple relationship structure', () => {
    const fs = FormatStringExpression.parse('{company.name}');
    expect(getPreloadRelationships(personType, [fs])).toEqual({
      company: {}
    });
  });

  it('should extract another relationship structure', () => {
    const fs = FormatStringExpression.parse('{company.category}');
    expect(getPreloadRelationships(personType, [fs])).toEqual({
      company: { category: {} }
    });
  });

  it('should recursively extract a relationship structure', () => {
    const fs = FormatStringExpression.parse('{company}');
    expect(getPreloadRelationships(personType, [fs])).toEqual({
      company: { category: {} }
    });
  });

  it('should not repeat', () => {
    const fs = FormatStringExpression.parse('{company} {company.category} {company.category.name}');
    expect(getPreloadRelationships(personType, [fs])).toEqual({
      company: { category: {} }
    });
  });

  it('should handle repeats', () => {
    companyType.displayFormat = SchemaObjectDisplayExpression.parse('{name}');
    const fs = FormatStringExpression.parse('{company.category.name} {company.category} {company}');
    expect(getPreloadRelationships(personType, [fs])).toEqual({
      company: { category: {} }
    });
  });

  it('should handle more repeats', () => {
    companyType.displayFormat = SchemaObjectDisplayExpression.parse('{name}');
    const fs = FormatStringExpression.parse('{company.category.name} {company.category} {company.name}');
    expect(getPreloadRelationships(personType, [fs])).toEqual({
      company: { category: {} }
    });
  });

  it('should handle bad input', () => {
    const fs = FormatStringExpression.parse('{something.else} {company.what.is.this}');
    expect(getPreloadRelationships(personType, [fs])).toEqual({
      company: {}
    });
  });

  it('merges relationships across array and named columns', () => {
    const columns = [
      FormatStringExpression.parse('{company.name}'),
      FormatStringExpression.parse('{company.category.name}')
    ];
    expect(getPreloadRelationships(personType, columns)).toEqual({ company: { category: {} } });
    expect(getPreloadRelationships(personType, { name: columns[0], category: columns[1] })).toEqual({
      company: { category: {} }
    });
  });

  it('should handle recursive display names', () => {
    const element = parseXML(
      '<object name="asset" label="Asset">' +
        '<attribute name="serial_number" label="Serial Number" type="string" />' +
        '<belongs_to name="asset" type="asset"/>' +
        '<display format="Asset: {asset}" />' +
        '</object>'
    ).documentElement;

    const parser = schemaParserV2(schema);
    const assetType = parser.parseObjectType(element);
    schema.objects[assetType.name] = assetType;
    parser.parseBelongsTo(assetType, element);
    parser.parseDisplay(assetType, element);
    expect(parser.getErrors()).toEqual([]);

    // It is not important what exactly the structure is, as long as it doesn't throw an error
    const structure = getPreloadRelationships(assetType);
    expect(typeof structure).toBe('object');
  });
});
