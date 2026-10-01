import { Version } from '@ja-platform/parser-common';
import { beforeAll } from 'vitest';
import { Database, DBSchema as Schema, WebSQLAdapter } from '../../src';

beforeAll(async () => {
  if ((window as any).openDatabase == undefined) {
    const openDatabase = require('websql');
    (window as any).openDatabase = () => {
      return openDatabase(':memory:', '1.0', 'Test database', 1);
    };
  }
});

const v3 = new Version('3.1');

export interface DBTestContext {
  adapter: WebSQLAdapter;
  schema: Schema;
  db: any;
}

export async function setupContext(schemaXML: string): Promise<DBTestContext> {
  await WebSQLAdapter.clear();
  const adapter = new WebSQLAdapter({ name: 'objects', stf: false });
  await adapter.open();

  const schema = new Schema().loadXml(schemaXML, { apiVersion: v3 });
  const db = new Database(schema, adapter);

  return {
    adapter,
    schema,
    db
  };
}
