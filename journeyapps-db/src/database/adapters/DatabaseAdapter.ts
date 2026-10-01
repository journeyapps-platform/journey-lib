import { ValueSerializeOptions } from '@ja-platform/parser-schema';
import { Query } from '../../query/Query';
import { ObjectData } from '../../types/ObjectData';
import { ExecuteBatchOperation, ExecuteBatchResult } from '../Batch';

export interface DatabaseAdapter {
  batchLimit: number;
  name: string;

  serializeOptions?: ValueSerializeOptions;

  description(): string;

  applyBatch(ops: ExecuteBatchOperation[]): Promise<ExecuteBatchResult[]>;

  /**
   * Lookup an object. Returns a promise that is resolved with the object data, or null if not found.
   */
  get(type: string, id: string): Promise<ObjectData>;

  close(): void;

  executeQuery(query: Query): Promise<ObjectData[]>;

  explain(query: Query): Promise<any>;

  count(query: Query): Promise<number>;

  getAll(type: string, ids: string[]): Promise<ObjectData[]>;
}
