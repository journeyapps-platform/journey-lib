import { DatabaseAdapter } from '../database/adapters/DatabaseAdapter';
import { Expression, TrueExpression, expressionFromHash, parse as parseQuery, AndExpression } from './queryOperations';
import { DatabaseObject } from '../database/DatabaseObject';
import { Batch } from '../database/Batch';
import { ObjectData } from '../types/ObjectData';
import { GenericObject } from '../types/GenericObject';
import { FormatStringExpression } from '@journeyapps/evaluator';
import * as j from '../utils/JourneyPromise';
import { ObjectType } from '../types/ObjectType';

const cloneDeep = require('lodash/cloneDeep'); // tslint:disable-line

interface RelationshipHash {
  [key: string]: RelationshipHash;
}

export class Query<T extends DatabaseObject = DatabaseObject> {
  /** @internal */
  readonly adapter: DatabaseAdapter;
  readonly type: ObjectType;

  /** @internal */
  expression: Expression;

  /** @internal */
  ordering: any[];
  /** @internal */
  limitNumber: number;
  /** @internal */
  skipNumber: number;

  /** @internal */
  private _freshness: number; // tslint:disable-line

  /** @internal */
  private _include: RelationshipHash; // tslint:disable-line

  static isQuery(value: any): boolean {
    if (value == null) {
      return false;
    }
    if (value instanceof Query) {
      return true;
    }
    if (typeof value == 'object') {
      // This covers other implementations of the Query class
      return typeof value.where == 'function' && typeof value.toArray == 'function';
    }
    return false;
  }

  constructor(adapter: DatabaseAdapter, type: ObjectType, expression?: Expression, ordering?: any[]) {
    // type is the object type, not the query type
    if (adapter == null || type == null) {
      throw new Error('not enough arguments');
    }

    if (ordering == null) {
      ordering = [];
    }

    if (expression == null) {
      expression = new TrueExpression();
    }

    this.ordering = ordering;
    this.expression = expression;
    this.adapter = adapter;
    this.type = type;
    this.limitNumber = null;
    this.skipNumber = 0;
    // Relationship structure to preload.
    this._include = {};

    // Watch this variable for changes to determine when the query should be reloaded.
    this._freshness = nextFreshness();

    // We throw an exception when old API methods are being used, instead of just failing silently.
    Object.defineProperty(this, 'length', {
      get: function () {
        throw new Error('Use .count() instead of .length on a query.');
      }
    });

    // We cannot check access to all indices, but we can check for [0], which is the most commonly used case.
    Object.defineProperty(this, '0', {
      get: function () {
        throw new Error('Queries are not arrays. Use .fetch() on a query to get an array.');
      }
    });
  }

  /** @internal */
  _clone(newType?: ObjectType): Query<T> {
    if (newType == null) {
      newType = this.type;
    }
    let clonedQuery = new Query<T>(this.adapter, newType, this.expression, this.ordering);
    clonedQuery.limitNumber = this.limitNumber;
    clonedQuery.skipNumber = this.skipNumber;
    clonedQuery._include = cloneDeep(this._include);
    return clonedQuery;
  }

  /** @internal */
  _filter(objects: ObjectData[]): ObjectData[] {
    var result = [];
    for (var i = 0; i < objects.length; i++) {
      var object = objects[i];
      if (this.expression == null || this.expression.evaluate(object)) {
        result.push(object);
      }
    }
    return result;
  }

  // Since we don't store any query results, this doesn't actually reload anything.
  // However, it changes the value of _freshness, so that users of this query know to reload it.
  private _reload() {
    this._freshness = nextFreshness();
  }

  /** @internal */
  _sort(objects: ObjectData[]): ObjectData[] {
    const ordering = this.ordering;
    if (ordering.length > 0) {
      objects.sort(function (a, b) {
        for (let i = 0; i < ordering.length; i++) {
          let attribute = ordering[i];
          let ascending = 1;
          if (attribute[0] == '-') {
            ascending = -1;
            attribute = attribute.substring(1);
          }
          const valueA = a.attributes[attribute];
          const valueB = b.attributes[attribute];

          const diff = compare(valueA, valueB);
          if (diff !== 0) {
            return diff * ascending;
          }
        }
        const idDiff = compare(a.id, b.id);

        // Do final sorting by ID to make it deterministic.
        return idDiff;
      });
    }
    return objects;
  }

  /** @internal */
  async _fetch(): Promise<T[]> {
    const data = await this.adapter.executeQuery(this);
    var result = [];

    for (let i = 0; i < data.length; i++) {
      const objdata = data[i];
      const object = DatabaseObject.build(this.adapter, this.type, objdata.id, objdata) as T;
      result.push(object);
    }

    if (Object.keys(this._include).length > 0) {
      return preload(this.adapter, this.type, result, this._include);
    } else {
      return result;
    }
  }

  private _explain() {
    return this.adapter.explain(this);
  }

  // This version pre-loads relationships in the display format. It is purely an optimization.
  // If columns (Array of FormatStringExpression) is specified, it is used to determine
  // the relationship structure. Otherwise, the displayFormat is used.
  _fetchWithDisplay(columns?: FormatStringExpression[] | Record<string, FormatStringExpression>) {
    const relationships = getPreloadRelationships(this.type, columns);
    return this._includeInternal(relationships)._fetch();
  }

  /** @internal */
  async _get(): Promise<T> {
    if (arguments.length > 0) {
      // e.g. .get({make: 'Nokia'})
      return this.where.apply(this, arguments)._get();
    }

    const results = await this.adapter.executeQuery(this.limit(1));
    let data: any;
    if (results.length > 0) {
      data = results[0]; // skip is already applied by the executeQuery
    } else {
      data = null;
    }

    if (data) {
      return DatabaseObject.build(this.adapter, this.type, data.id, data) as T;
    } else {
      return null;
    }
  }
  /**
   * Apply additional query filters, as a new query.
   *
   * @param query the query string
   * @param args query arguments
   */
  where(query: string, ...args: any[]): Query<T>;

  /**
   * Apply additional filters, as a new query.
   *
   * @param filters an object of {field: value}
   */
  where(filters?: any): Query<T>;

  /**
   * Return a copy of this query.
   */
  where(): Query<T>;

  where(filters?: any, ...args: any[]): Query<T> {
    const cloned = this._clone();
    if (arguments.length > 0) {
      let e: Expression;
      if (typeof filters == 'object') {
        // example: where({make: 'Nokia', model: '5800})
        e = expressionFromHash(this.type, filters);
      } else {
        // example: where('make = ? and model = ?', 'Nokia', '5800')
        e = parseQuery(this.type, filters, args);
      }
      const combined = new AndExpression([this.expression, e]);
      cloned.expression = combined;
    }
    return cloned;
  }

  private order_by(...fields: string[]) {
    const attributes = Array.prototype.slice.call(fields);
    let q = this._clone();
    q.ordering = attributes;
    return q;
  }

  /**
   * Limit the maximum number of results returned by the query.
   *
   * A new query is returned - the original one is not modified.
   *
   * @param n maximum number of results
   */
  limit(n: number) {
    let q = this._clone();
    q.limitNumber = n;
    return q;
  }

  /**
   * Skip the first n results in the query. Typically used together with limit() for pagination.
   *
   * A new query is returned - the original one is not modified.
   *
   * @param n number of results to skip.
   */
  skip(n: number) {
    let q = this._clone();
    q.skipNumber = n;
    return q;
  }

  /**
   * Pre-load belongs-to relationships when executing the query.
   *
   * This allows the implementation to batch the lookups, which is faster than loading each related
   * object individually.
   *
   * Nested belongs-to relationships are supported by using dots, e.g. `.include('owner.region')`.
   *
   * A new query is returned - the original one is not modified.
   *
   * @param relationships belongs-to names
   */
  include(...relationships: string[]) {
    let q = this._clone();
    for (let rel of relationships) {
      normalizeInclude(q._include, rel);
    }
    return q;
  }

  private _destroy_all() {
    return this._fetch().then((objects: DatabaseObject[]) => {
      let batch = new Batch(this.adapter);

      objects.forEach(function (object) {
        batch.destroy(object);
      });

      return batch._execute();
    });
  }

  private _count() {
    return this.adapter.count(this);
  }

  // Aliases

  /**
   * Execute the query and return the results.
   */
  toArray(): j.Promise<T[]> {
    return this._toArray();
  }

  /**
   * Apply additional filters, then return the first result.
   *
   * @param filters an object of {attribute: value}
   */
  first(filters?: { [key: string]: any }): j.Promise<T | null>;

  /**
   * Apply additional query filters, then return the first result.
   *
   * Same as .where(...).first().
   *
   * @param query the query string
   * @param args query arguments
   */
  first(query: string, ...args: any[]): j.Promise<T | null>;

  /**
   * Return the first result matched by this query.
   */
  first(): j.Promise<T | null>;

  first(): j.Promise<T | null> {
    return this._first.apply(this, arguments);
  }

  /**
   * Return the number of results matched by the query.
   *
   * If .limit() was used, it would be respected for the count.
   */
  count(): j.Promise<number> {
    return this._count.apply(this, arguments);
  }

  /**
   * Return executions stats for the query.
   *
   * The format of the results is not fixed, and may change across versions.
   * For debugging use only.
   */
  explain(): j.Promise<any> {
    return this._explain.apply(this, arguments);
  }

  /**
   * Destroy all objects matched by this query.
   *
   * skip() and limit() is respected for this.
   */
  destroyAll(): j.Promise<void> {
    return this._destroyAll.apply(this, arguments);
  }

  private _toArray(): Promise<T[]> {
    return this._fetch.apply(this, arguments);
  }

  private _first(): Promise<T | null> {
    return this._get.apply(this, arguments);
  }

  private _destroyAll(): Promise<void> {
    return this._destroy_all.apply(this, arguments);
  }

  /**
   * Order by one or more attributes.
   *
   * A new query is returned - the original one is not modified.
   *
   * @param fields an array of field names to order by. Prefix with - for descending, e.g. `-updated_at`.
   */
  orderBy(...fields: string[]): Query<T> {
    return this.order_by.apply(this, fields);
  }

  /**
   * For debugging purposes only.
   *
   * The format of the result is not defined.
   */
  toJSON() {
    return {
      type: this.type.name,
      expression: this.expression,
      ordering: this.ordering,
      limit: this.limitNumber,
      skip: this.skipNumber,
      include: this._include
    };
  }

  private _includeInternal(relationshipHash: RelationshipHash) {
    let q = this._clone();
    deepMerge(q._include, relationshipHash);
    return q;
  }
}

function compare(a: any, b: any) {
  if (typeof a == 'string' && typeof b == 'string') {
    // Case insensitive comparison
    a = a.toLowerCase();
    b = b.toLowerCase();
  }

  // We can't > or < with `null` or `undefined` - do this manually.
  // null, undefined < anything else
  // Note that `== null` also matches `undefined`.
  if (a == null && b == null) {
    return 0;
  } else if (a == null) {
    return -1;
  } else if (b == null) {
    return 1;
  } else if (a > b) {
    return 1;
  } else if (a < b) {
    return -1;
  } else {
    return 0;
  }
}

var globalFreshness = 0;

function nextFreshness() {
  globalFreshness += 1;
  return globalFreshness;
}

// Merge hashes of hashes (no non-hash values)
function deepMerge(a: RelationshipHash, b: RelationshipHash): RelationshipHash {
  Object.keys(b).forEach(function (key) {
    if (!(key in a)) {
      a[key] = {};
    }
    deepMerge(a[key], b[key]);
  });
  return a;
}

function getPreloadRelationships(
  type: ObjectType,
  columns?: FormatStringExpression[] | Record<string, FormatStringExpression>
) {
  // Not the most efficient function, but should be little overhead
  // compared to querying the database.
  let relationships: RelationshipHash = {};
  if (columns == null) {
    // object-list, use the default display format for the object
    deepMerge(relationships, type.displayFormat.extractRelationshipStructure(type));
  } else {
    // object-table, use the specified column values
    if (Array.isArray(columns)) {
      for (let display of columns) {
        if (display && typeof display.extractRelationshipStructure == 'function') {
          deepMerge(relationships, display.extractRelationshipStructure(type));
        }
      }
    } else {
      for (let key in columns) {
        const display = columns[key];
        if (display && typeof display.extractRelationshipStructure == 'function') {
          deepMerge(relationships, display.extractRelationshipStructure(type));
        }
      }
    }
  }

  return relationships;
}

function normalizeInclude(into: RelationshipHash, expression: string) {
  const dot = expression.indexOf('.');
  if (dot < 0) {
    if (!(expression in into)) {
      into[expression] = {};
    }
    return into;
  }

  const head = expression.substring(0, dot); // The first part of the expression
  const tail = expression.substring(dot + 1); // The rest of the expression

  if (!(head in into)) {
    into[head] = {};
  }
  normalizeInclude(into[head], tail);
  return into;
}

// Recursively preload a relationship structure
// objects: Array of DatabaseObject
// relationships example: {'room' => {'building' => {}}, 'otherrel' => {}}
async function preload<T extends DatabaseObject>(
  adapter: DatabaseAdapter,
  type: ObjectType,
  objects: T[],
  relationships: RelationshipHash
): Promise<T[]> {
  let outerPromises: Promise<void>[] = [];

  for (let key in relationships) {
    const relatedType = type.getAttribute(key).type;
    if (!(relatedType instanceof ObjectType)) {
      throw new Error(`${type.name}.${key} is not a belongs-to relationship`);
    }
    const nestedRelationships = relationships[key];

    // Get ids of all the belongsTo objects in the relationship
    let ids = [];
    for (let object of objects) {
      const id = (object as GenericObject)[key + '_id'];
      ids.push(id);
    }

    let nestedObjects: DatabaseObject[] = [];

    const promise = adapter.getAll(relatedType.name, ids).then(async (data) => {
      for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const relatedData = data[i];
        if (relatedData != null) {
          const related = DatabaseObject.build(adapter, relatedType, relatedData.id, relatedData);
          object._cache(key, related);
          nestedObjects.push(related);
        } else {
          // We need to record the fact that we couldn't find the object, so that other
          // code doesn't need to try again.
          object._cache(key, null);
        }
      }

      if (Object.keys(nestedRelationships).length > 0) {
        // Recursively load nested relationships
        await preload(adapter, relatedType, nestedObjects, nestedRelationships);
      }
    });

    outerPromises.push(promise);
  }

  await Promise.all(outerPromises);
  return objects;
}
