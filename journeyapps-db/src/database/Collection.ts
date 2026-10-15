import { DatabaseObject } from './DatabaseObject';
import { SchemaModelType } from '@ja-platform/parser-schema';
import { DatabaseAdapter } from './adapters/DatabaseAdapter';
import { Query } from '../query/Query';
import * as j from '../utils/JourneyPromise';

// ## Collection
// This is the external interface for an object collection, as in `DB.asset`.

export class Collection<T extends DatabaseObject = DatabaseObject> {
  type: SchemaModelType;
  adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter, type: SchemaModelType) {
    this.type = type;
    this.adapter = adapter;
  }

  /**
   * Query for all objects in the collection. The query may be filtered further.
   *
   * Return the results as a Query. Call `.toArray()` to get the results.
   */
  all(): Query<T> {
    return new Query(this.adapter, this.type);
  }

  /**
   * Create a new object.
   *
   * It is not saved until .save() is called.
   *
   * @param attributes - Enumerable object to initialize with.
   */
  create(attributes?: any): T {
    let object = DatabaseObject.build(this.adapter, this.type);
    object.setAll(attributes);
    return object as T;
  }

  /**
   * Filter by a query string and arguments.
   *
   * Return the results as a Query. Call `.toArray()` to get the results.
   *
   *
   * Example:
   *
   *    DB.user.where('email = ? and archived != ?', email, false)
   *
   * @param query the query string
   * @param args the query args
   */
  where(query: string, ...args: any[]): Query<T>;

  /**
   * Filter by an object of {attribute: value} pairs.
   *
   * Return the results as a Query. Call `.toArray()` to get the results.
   *
   * @param filters an object of {field: value}
   */
  where(filters: { [key: string]: any }): Query<T>;

  /**
   * Same as .all()
   */
  where(): Query<T>;

  where(...args: any[]): Query<T> {
    return this.all().where(...args);
  }

  /** @internal */
  _get(id?: string): Promise<T | null> {
    // TODO: varargs
    if (arguments.length == 1 && typeof arguments[0] == 'string') {
      // Find by ID - return a placeholder
      const promise = this.adapter.get(this.type.name, id);
      return promise.then((data) => {
        if (data == null) {
          return null;
        } else {
          return DatabaseObject.build(this.adapter, this.type, id, data) as T;
        }
      });
    } else if (arguments.length == 1 && arguments[0] == null) {
      // This can happen when passing in null/undefined as an ID.
      return Promise.reject('Query expression or ID required');
    } else {
      // Same as a where query, but only return a single result.
      return this.where.apply(this, arguments)._get();
    }
  }

  // Aliases
  private _first(): Promise<T> {
    return this._get.apply(this, arguments);
  }

  /**
   * Get a single object by id.
   */
  first(id: string): j.Promise<T>;

  /**
   * Get a single object by query.
   *
   * If the query has more than one matching result, only the first seen one is returned.
   *
   * Same as .where(...).first().
   *
   * @param query the query string
   * @param args the query args
   */
  first(query: string, ...args: any[]): j.Promise<T>;

  /**
   * Return a single object from the collection.
   */
  first(): j.Promise<T>;

  /**
   * Get a single object by query.
   *
   * If the query has more than one matching result, only the first seen one is returned.
   *
   * Same as .where(...).first().
   *
   * @param filters an object of {field: value}
   */
  first(filters: { [key: string]: any }): j.Promise<T>;

  first(): j.Promise<T> {
    return this._get.apply(this, arguments);
  }
}

export type TypedCollection<T> = Collection<DatabaseObject & T>;
