import { VariableFormatStringScope } from '@journeyapps/evaluator';
import * as uuid from 'uuid';
import { Query } from '../query/Query';
import { RelationMatch } from '../query/queryOperations';
import { GenericObject } from '../types/GenericObject';
import { ObjectData } from '../types/ObjectData';
import { ObjectType } from '../types/ObjectType';
import * as j from '../utils/JourneyPromise';
import { DatabaseAdapter } from './adapters/DatabaseAdapter';
import { Batch, CrudError } from './Batch';

// type is the type object, not the name
export class DatabaseObject {
  // id is optional. If not specified, a new one will be assigned automatically.
  /** @internal */
  static build<T = {}>(adapter: DatabaseAdapter, type: ObjectType, id?: string, data?: any): DatabaseObject & T {
    var obj = new DatabaseObject(adapter, type, id);
    if (data != null) {
      obj.resolve(data);
    }
    return obj as DatabaseObject & T;
  }

  /**
   * ID of the object, generated when the object is first created.
   */
  readonly id: string;
  readonly type: ObjectType;
  /** @internal */
  _adapter: DatabaseAdapter; // tslint:disable-line

  /**
   * true if this object has ben saved to the database.
   */
  persisted: boolean;

  // functions set in the constructor
  /** @internal */
  resolve: (data: ObjectData) => void;

  /**
   * Set all values provided in an enumerable object.
   *
   * @param values - the values to set
   */
  setAll: (values?: any) => void;

  /** @internal */
  toData: (patch: boolean) => ObjectData;

  /** @internal */
  _getDirtyList: (into?: any[]) => DatabaseObject[]; // tslint:disable-line
  private _reload: () => Promise<void>; // tslint:disable-line
  private _save: () => Promise<void>; // tslint:disable-line
  private _destroy: () => Promise<void>; // tslint:disable-line
  /** @internal */
  _cache: (name: string, value: DatabaseObject) => void; // tslint:disable-line
  /** @internal */
  _persisted: () => boolean; // tslint:disable-line
  /** @internal */
  _destroyed: () => boolean; // tslint:disable-line

  constructor(adapter: DatabaseAdapter, type: ObjectType, id: string) {
    if (adapter == null || typeof adapter.get != 'function') {
      throw new Error('adapter is required');
    }
    if (type == null || typeof type.attributes != 'object') {
      throw new Error('type is required');
    }
    const objself = this;

    // This is where all the attributes are stored
    const attributes: { [index: string]: any } = {};

    // Attributes that have been set by the user.
    let attributesDirty: { [index: string]: boolean } = {};

    // belongsToIds is only used when there is no corresponding object in belongsToCache.
    const belongsToIds: { [index: string]: string } = {};

    // belongsToCache serves as a cache for relationships. The id in belongsToIds should always correspond to
    // the id here, if the object is present.
    // `null` means that we looked for the object but it doesn't exist (on the client), while `undefined` / not present
    // means that we haven't queried yet.
    let belongsToCache: { [index: string]: DatabaseObject } = {};

    // Relationships that have been set by the user.
    // true means set by user, false or not present means not set
    let belongsToDirty: { [index: string]: boolean } = {};

    // We keep track of what we are currently loading, so that we don't execute the same query many times
    // in succession.
    const belongsToLoading: { [index: string]: Promise<DatabaseObject> } = {};

    // Caching the queries prevents them from being re-executed all the time.
    let hasManyCache: { [index: string]: Query } = {};

    let persisted: boolean;
    let destroyed = false;

    if (id == null) {
      // New object
      id = uuid.v4();
      persisted = false;
    } else {
      // Existing object that is already loaded
      persisted = true;
    }

    // id is read-only in public, but may change internally
    Object.defineProperty(this, 'id', {
      enumerable: false,
      configurable: false,
      get: function () {
        return id;
      }
    });

    // persisted is read-only in public, but may change internally
    Object.defineProperty(this, 'persisted', {
      enumerable: false,
      configurable: false,
      get: function () {
        return persisted;
      }
    });

    defineHiddenConstant(this, 'type', type);

    // Reload an object.
    // Returns a promise that is resolved with the same object when it is loaded.
    // If the object does not exist anymore, the promise is resolved with `null`.
    // If the object is not loaded yet, this returns its original promise.
    function _reload() {
      if (id == null) {
        throw new Error('Object is not saved yet - cannot reload');
      }
      return adapter.get(type.name, id).then(function (data) {
        resolve(data);
      });
    }

    function resolve(data: ObjectData): void {
      if (data != null) {
        const resolveAttributes = data.attributes || {};
        Object.keys(type.attributes).forEach(function (key) {
          const attribute = type.attributes[key];
          const value = resolveAttributes[key];

          // We don't override any attributes that have already been set.
          if (!attributesDirty[key]) {
            const realValue = value == null ? null : attribute.type.valueFromJSON(value);

            // We use the setter so that type checking occurs...
            try {
              setAttribute(key, realValue);
            } catch (err) {
              // ... but we ignore invalid attributes
            }
            // ... and we don't want the attribute to be marked as dirty.
            attributesDirty[key] = false;
          }
        });

        const loadedBelongsToIds = data.belongs_to || {};

        // Loop through all relationships, not just the ones in the data.
        // This is to ensure that cleared relationships are handled
        // correctly.
        Object.keys(type.belongsTo).forEach(function (key) {
          const belongsToId = loadedBelongsToIds[key];
          // We don't override any relationships that have already been set.
          if (!belongsToDirty[key]) {
            // Save the id
            belongsToIds[key] = belongsToId;

            // Clear any cached object
            delete belongsToCache[key];

            // Cancel the loading of any previous relationships
            delete belongsToLoading[key];
          }
        });

        id = data.id;
        if (id != null) {
          persisted = true;
        }

        hasManyCache = {};
      }
    }

    function setAll(values: any) {
      if (values != null) {
        for (let key in values) {
          if (values.hasOwnProperty(key)) {
            _set(key, values[key]);
          }
        }
      }
    }

    let saving = false;

    // Returns a promise that is resolved when this object is saved.
    async function _save() {
      if (destroyed) {
        // Don't save an object that has been destroyed.
        return;
      }

      // Create a batch with this object.
      // Note that other objects may implicitly be added to the batch via
      // belongs-to relationships.
      let batch = new Batch(adapter);
      batch.save(this);
      return batch._execute().catch(function (error: any) {
        if (error instanceof CrudError) {
          return Promise.reject(error.firstError());
        } else {
          return Promise.reject(error);
        }
      });
    }

    /**
     * Mark the object as persisted.
     */
    function _persisted() {
      persisted = true;

      // Clear the "dirty" state
      attributesDirty = {};
      belongsToDirty = {};
    }

    /**
     * Mark the object as destroyed.
     */
    function _destroyed() {
      persisted = false;
      destroyed = true;
    }

    /**
     * Returns an array of this object and any related objects that should be saved.
     *
     * @param [into] - array to populate
     */
    function _getDirtyList(into?: any[]): any[] {
      if (into == null) {
        into = [];
      }
      if (destroyed) {
        // Don't save a destroyed object
        return into;
      }
      if (saving) {
        // Prevent recursion into self
        return into;
      }
      saving = true;
      into.push(objself);
      try {
        Object.keys(belongsToCache).forEach(function (key) {
          const related = belongsToCache[key];
          if (related != null) {
            if (related._adapter === adapter) {
              related._getDirtyList(into);
            } else {
              // Different adapter - can't add to the same batch.
              // Don't save the related object in this case.
            }
          }
        });
        return into;
      } finally {
        saving = false;
      }
    }

    // Delete this object.
    // Returns a promise that is resolved when this object is deleted.
    async function _destroy() {
      if (id != null) {
        const batch = new Batch(adapter);
        batch.destroy(this);
        try {
          await batch._execute();
        } catch (error) {
          if (error instanceof CrudError) {
            throw error.firstError();
          } else {
            throw error;
          }
        }
      } else {
        destroyed = true;
      }
    }

    // Return a string representation of this object, according to the display format.
    // Only returns the correct value if the object is already loaded.
    function toString() {
      var displayFormat = type.displayFormat;
      return displayFormat.evaluate(new VariableFormatStringScope(objself));
    }

    function toData(patch?: boolean) {
      // We don't modify belongToIds here - this must be a read-only method.
      let jsonBelongsTo: { [index: string]: string } = {};

      Object.keys(type.belongsTo).forEach(function (name) {
        let belongsToId = belongsToIds[name];
        if (patch) {
          if (belongsToDirty[name]) {
            jsonBelongsTo[name] = belongsToId;
          }
        } else {
          if (belongsToId != null) {
            jsonBelongsTo[name] = belongsToId;
          }
        }
      });

      let jsonAttributes: { [key: string]: any } = {};
      Object.keys(type.attributes).forEach(function (name) {
        const attribute = type.attributes[name];
        const value = attributes[name];
        if (patch) {
          if (attributesDirty[name]) {
            if (value == null) {
              jsonAttributes[name] = null;
            } else {
              jsonAttributes[name] = attribute.type.valueToJSON(value, adapter.serializeOptions);
            }
          }
        } else {
          if (value != null) {
            jsonAttributes[name] = attribute.type.valueToJSON(value, adapter.serializeOptions);
          }
        }
      });

      return {
        id: objself.id,
        type: type.name,
        attributes: jsonAttributes,
        belongs_to: jsonBelongsTo
      };
    }

    // Getters and setters for attributes
    const blacklist = ['save', 'id', '_database', 'reload'];

    function setAttribute(name: string, value: any) {
      const attribute = type.attributes[name];
      if (attribute == null) {
        return;
      }
      // Convert it to the correct type, or throw an exception if it is of invalid type.
      if (value == null) {
        // Includes undefined.
        value = null;
      } else {
        value = attribute.type.cast(value);
      }

      // We specifically don't want to set the value to null if the object is not loaded yet.
      // This causes the value to be cleared by the view before the object is loaded.
      if (attributes[name] != value) {
        attributes[name] = value;
        attributesDirty[name] = true;
      }
    }

    Object.keys(type.attributes).forEach((name) => {
      if (blacklist.indexOf(name) != -1) {
        return;
      }

      Object.defineProperty(objself, name, {
        get() {
          return attributes[name];
        },
        set(value: any) {
          setAttribute(name, value);
        },
        enumerable: true,
        configurable: true
      });

      attributes[name] = null;
    });

    function setBelongsTo(name: string, value: DatabaseObject) {
      // setter
      if (value == null) {
        belongsToCache[name] = null;
        belongsToIds[name] = null;
        belongsToDirty[name] = true;
      } else if (value instanceof DatabaseObject) {
        belongsToCache[name] = value;
        belongsToIds[name] = value.id;
        belongsToDirty[name] = true;
      } else {
        if (typeof value == 'function') {
          // This seems to be the return value of a relationship lookup without parenthesis.
          throw new Error('Use `.relationship()` instead of `.relationship` when looking up a relationship.');
        } else {
          throw new Error(value + ' is not a valid object');
        }
      }
    }

    function triggerLoad(name: string) {
      const rel = type.belongsTo[name];
      if (rel == null) {
        return 'nothing to load';
      }

      // undefined means not looked up yet.
      // null means we looked it up, but didn't find anything.
      if (belongsToCache[name] === undefined) {
        if (belongsToLoading[name]) {
          // An query have already been made for this relationship - return the same promise.
          return 'already loading';
        } else {
          const _ignorePromise = getBelongsTo(name);
          return 'loading';
        }
      } else {
        return 'already loaded';
      }
    }

    async function getBelongsTo(name: string): Promise<DatabaseObject> {
      const rel = type.belongsTo[name];
      if (rel == null) {
        return undefined;
      }

      // undefined means not looked up yet.
      // null means we looked it up, but didn't find anything.
      if (belongsToCache[name] === undefined) {
        if (belongsToLoading[name]) {
          // An query have already been made for this relationship - return the same promise.
          return belongsToLoading[name];
        } else {
          const foreignType = rel.foreignType;
          const relatedId = belongsToIds[name];
          const promise = adapter.get(foreignType.name, relatedId);
          const promise2 = promise.then(function (data: ObjectData) {
            let obj: DatabaseObject = null;
            if (data) {
              obj = DatabaseObject.build(adapter, foreignType, relatedId, data);
            }

            if (belongsToLoading[name] == promise2) {
              delete belongsToLoading[name];
              belongsToCache[name] = obj;
            } else {
              // This promise has been canceled.
              // We still return the same result, but don't update the cache.
            }
            return obj;
          });
          belongsToLoading[name] = promise2;
          return promise2;
        }
      } else {
        return belongsToCache[name];
      }
    }

    Object.keys(type.belongsTo).forEach(function (name) {
      if (blacklist.indexOf(name) != -1) {
        return;
      }

      var accessor = createAccessor(name, setBelongsTo, getBelongsTo);

      if (accessor != null) {
        Object.defineProperty(objself, name, {
          get: function () {
            // There's no robust way to test that the accessor is being used as a function.
            return accessor;
          },
          set: function () {
            // Technically we can set the value here. However, it will be inconsistent with the getter.
            throw new Error('Use `.' + name + '(value)` instead of `.' + name + ' = value` to set a relationship.');
          },
          enumerable: false,
          configurable: false
        });
      }

      // Getter and setter for belongs-to ids.
      Object.defineProperty(objself, name + '_id', {
        get: function () {
          return belongsToIds[name] || null; // `|| null` so we return null instead of undefined
        },
        set: function (relatedId: string) {
          // Save the id
          belongsToIds[name] = relatedId;
          belongsToDirty[name] = true;

          // Clear any cached object
          delete belongsToCache[name];

          // Cancel the loading of any previous relationships
          delete belongsToLoading[name];
        },
        enumerable: false,
        configurable: false
      });
    });

    Object.keys(type.hasMany).forEach(function (name) {
      const rel = type.hasMany[name];
      if (blacklist.indexOf(name) != -1) {
        return;
      }

      // We return a query
      Object.defineProperty(objself, name, {
        get: function () {
          if (hasManyCache[name] == null) {
            // We cache the Query object, along with its _freshness value.
            // This does not cache the results - widgets are responsible for that.
            const expr = new RelationMatch(rel.name, objself.id);
            hasManyCache[name] = new Query(adapter, rel.objectType, expr);
          }
          return hasManyCache[name];
        },
        enumerable: false,
        configurable: false
      });
    });

    // Return an attribute or relationship as a promise.
    async function _get(name: string): Promise<any> {
      // TODO: belongs_to ids
      if (name === 'id') {
        return id;
      }

      if (type.attributes[name]) {
        return (objself as GenericObject)[name];
      }

      if (type.belongsTo[name]) {
        return getBelongsTo(name);
      }

      if (type.hasMany[name]) {
        return (objself as GenericObject)[name];
      }

      return null;
    }

    // Return an attribute or cached relationship immediately.
    // If `name` is not a valid attribute or relationship, null is returned.
    // If `name` is a relationship or attribute that is not set, null is returned.
    // If `name` is a relationship that we're still loading, undefined is returned.
    // TODO: perhaps we should use a constant other than `undefined`?
    function _cached(name: string) {
      if (type.attributes[name]) {
        return (objself as GenericObject)[name];
      } else if (type.belongsTo[name]) {
        // Trigger a lookup (only has an effect if we haven't cached the relationship yet).
        triggerLoad(name);
        return belongsToCache[name];
      } else if (type.hasMany[name]) {
        return (objself as GenericObject)[name];
      } else {
        return null;
      }
    }

    function _cache(name: string, value: DatabaseObject) {
      // Cache a relationship
      // It is assumed that the id matches value.id
      belongsToCache[name] = value;
    }

    // Set an attribute or relationship.
    function _set(name: string, value: any) {
      if (type.attributes[name]) {
        (objself as GenericObject)[name] = value;
      } else if (type.belongsTo[name]) {
        setBelongsTo(name, value);
      } else {
        // Ignore
        // This behaviour is intentionally different from normal attribute assignment.
        // This makes it simpler to assign data from an external JSON source.
      }
    }

    function _clone(newType: ObjectType) {
      if (newType == null) {
        newType = type;
      }
      const data = toData(false); // TODO: should we convert to JSON and back?
      // If the object is not persisted, we generate a create an object
      // without an id. Otherwise the clone thinks it is persisted.
      const newId = persisted ? id : null;
      let clone = new DatabaseObject(adapter, newType, newId);
      clone.resolve(data);
      return clone;
    }

    function _display() {
      const displayFormat = type.displayFormat;
      return displayFormat.evaluatePromise(new VariableFormatStringScope(objself));
    }

    // public functions, but not enumerable
    defineHiddenConstant(this, '_reload', _reload);
    defineHiddenConstant(this, 'set_all', setAll);
    defineHiddenConstant(this, 'setAll', setAll);
    defineHiddenConstant(this, '_save', _save);
    defineHiddenConstant(this, '_destroy', _destroy);
    defineHiddenConstant(this, 'toString', toString);
    defineHiddenConstant(this, 'resolve', resolve);
    defineHiddenConstant(this, '_get', _get);
    defineHiddenConstant(this, '_cached', _cached);
    defineHiddenConstant(this, '_cache', _cache);
    defineHiddenConstant(this, '_set', _set);
    defineHiddenConstant(this, '_adapter', adapter);
    defineHiddenConstant(this, '_clone', _clone);
    defineHiddenConstant(this, '_display', _display);
    defineHiddenConstant(this, '_getDirtyList', _getDirtyList);
    defineHiddenConstant(this, '_persisted', _persisted);
    defineHiddenConstant(this, '_destroyed', _destroyed);

    defineHiddenConstant(this, 'toData', toData);

    // Sealing the object prevents new properties from being added.
    Object.seal(this);
  }

  // Aliases

  /**
   * Reload this object from the database.
   */
  reload(): j.Promise<void> {
    return this._reload();
  }

  /**
   * Save this object to the database.
   */
  save(): j.Promise<void> {
    return this._save();
  }

  /**
   * Delete this object from the database.
   */
  destroy(): j.Promise<void> {
    return this._destroy();
  }
}

function defineHiddenConstant(object: any, name: string, value: any) {
  Object.defineProperty(object, name, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: value
  });
}

export type CreateAccessor = (
  name: string,
  set: (name: string, value: any) => void,
  get: (name: string) => any
) => void;

export var createAccessor: CreateAccessor = (name, set, get) => {
  return (value?: any) => {
    if (typeof value != 'undefined') {
      return set(name, value);
    } else {
      return get(name);
    }
  };
};

// For internal use only
export function setCreateAccessor(fn: CreateAccessor) {
  createAccessor = fn;
}
