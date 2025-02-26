import { PersistedObjectData } from '../types/ObjectData';
import * as j from '../utils/JourneyPromise';
import { DatabaseAdapter } from './adapters/DatabaseAdapter';
import { Database } from './Database';
import { DatabaseObject } from './DatabaseObject';

interface BatchOperation {
  object: DatabaseObject;
  op: 'save' | 'destroy';
}

export interface BatchError {
  object: DatabaseObject;
  operation: 'put' | 'patch' | 'delete' | 'ignore';
  error: { detail: string };
}

export interface ExecuteBatchOperation {
  op: 'put' | 'patch' | 'delete' | 'ignore';
  type: string;
  id: string;
  object: DatabaseObject;
  data?: PersistedObjectData;
  patch?: PersistedObjectData;
}

export interface ExecuteBatchResult {
  error?: any;
}

function validateAdapter(batchAdapter: DatabaseAdapter, object: DatabaseObject) {
  if (object._adapter === batchAdapter || object._adapter.name == batchAdapter.name) {
    return;
  }
  throw new Error(
    'Cannot add an object in ' + object._adapter.description() + ' to a Batch in ' + batchAdapter.description()
  );
}

export class Batch {
  /** @internal */
  adapter: DatabaseAdapter;
  /** @internal */
  private _operations: BatchOperation[]; // tslint:disable-line

  /**
   * Construct a new batch.
   *
   * If the same object is added to the batch multiple times, only the last instance
   * is kept.
   *
   * @param adapter the Database instance
   */
  constructor(adapter: DatabaseAdapter | Database) {
    if ((adapter as Database)._adapter) {
      this.adapter = (adapter as Database)._adapter;
    } else {
      this.adapter = adapter as DatabaseAdapter;
    }
    this._operations = [];
  }

  /**
   * Add an object to save to the batch. The object is saved when batch.execute() is called.
   */
  save(object: DatabaseObject) {
    validateAdapter(this.adapter, object);
    this._operations.push({ op: 'save', object: object });
  }

  /**
   * Add an object to destroy to the batch. The object is destroyed when batch.execute() is called.
   */
  destroy(object: DatabaseObject) {
    validateAdapter(this.adapter, object);
    this._operations.push({ op: 'destroy', object: object });
  }

  /**
   * Execute the batch.
   *
   * There are two classes of errors:
   * 1. Network or code error. The entire batch is rejected with an error.
   * 2. Individual object errors. In this case, the batch is rejected with a CrudError, which contains the individual errors.
   */
  execute(): j.Promise<void> {
    return this._execute();
  }

  /**
   * @internal
   */
  async _execute(): Promise<void> {
    const ops = this._getOps();
    if (ops.length == 0) {
      return;
    }

    // Split into smaller batches, and execute them sequentially.
    const batchLimit = this.adapter.batchLimit || 1000;
    let splitBatches: ExecuteBatchOperation[][] = [];
    for (let i = 0; i < ops.length; i += batchLimit) {
      splitBatches.push(ops.slice(i, i + batchLimit));
    }

    const adapter = this.adapter;
    const errors: BatchError[] = [];
    for (const splitOps of splitBatches) {
      const results = await adapter.applyBatch(splitOps);

      splitOps.forEach((op, j) => {
        const result = results[j];

        if (result.error) {
          errors.push({
            object: op.object,
            operation: op.op,
            error: result.error
          });
          return;
        }

        if (op.op == 'put' || op.op == 'patch') {
          op.object._persisted();
          return;
        }

        if (op.op == 'delete') {
          op.object._destroyed();
          return;
        }
      });
    }

    if (errors.length > 0) {
      throw new CrudError(errors);
    }
  }

  private _getOps(): ExecuteBatchOperation[] {
    let opCache = new WeakMap<DatabaseObject, ExecuteBatchOperation>();

    let prebatch: ExecuteBatchOperation[] = [];

    // Dedup based on the object instance, not object id.
    function addOp(op: ExecuteBatchOperation) {
      const previousOp = opCache.get(op.object);

      if (previousOp) {
        if (previousOp.op == 'delete') {
          // Can't do anything after a delete. Ignore this op.
          // [delete1, save2] => [delete1]
          // [delete1, delete2] => [delete1] (delete2 would be the same)
          return;
        } else if (op.op == 'delete') {
          // Replace previous save
          // [save1, delete2] => [delete2]
          previousOp.op = 'ignore';
        } else {
          // Both are saves. Because it's the same object, the patch will be the same for both.
          // Ignore the second one.
          // [save1, save2] => [save1]
          return;
        }
      }
      opCache.set(op.object, op);
      prebatch.push(op);
    }

    for (let op of this._operations) {
      if (op.op == 'save') {
        // _getDirtyList does not return any destroyed objects.
        const dirtyList = op.object._getDirtyList();
        for (let object of dirtyList) {
          const data = object.toData(false);
          let patch = null;
          if (object.persisted) {
            patch = object.toData(true);
          }
          addOp({
            op: patch == null ? 'put' : 'patch',
            type: object.type.name,
            id: object.id,
            data: data,
            patch: patch,
            object: object
          });
        }
      } else if (op.op == 'destroy') {
        addOp({
          op: 'delete',
          type: op.object.type.name,
          id: op.object.id,
          object: op.object
        });
      } else {
        throw new Error('Unknown op: ' + op.op);
      }
    }

    let batch: ExecuteBatchOperation[] = [];

    for (let op of prebatch) {
      if (op.op == 'ignore') {
        continue;
      }
      if (op.op == 'patch') {
        if (Object.keys(op.patch.attributes).length === 0 && Object.keys(op.patch.belongs_to).length === 0) {
          // No-op
          continue;
        }
      }
      batch.push(op);
    }

    return batch;
  }
}

export class CrudError extends Error {
  errors: BatchError[];

  constructor(errors: BatchError[]) {
    super();
    this.errors = errors;

    let message = 'Crud operations failed.';
    errors.forEach(function (error) {
      message += '\n  ' + error.object.type.name + ' ' + error.object.id + ': ' + error.error.detail;
    });
    this.message = message;
  }

  /**
   * Return the first error. Useful if this was used for a single operation.
   */
  firstError() {
    return this.errors[0].error;
  }
}
