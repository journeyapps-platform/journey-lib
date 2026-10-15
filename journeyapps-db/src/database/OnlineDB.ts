import { ApiAdapterOptions, JourneyAPIAdapter } from './JourneyAPIAdapter';
import { Version } from '@ja-platform/parser-common';
import { ApiCredentialOptions, ApiCredentials } from '../credentials/ApiCredentials';
import { Database } from './Database';
import { DBSchema } from '../Schema';

export interface OnlineDBCredentials extends ApiCredentialOptions {
  adapter?: ApiAdapterOptions;
  dataModelPath?: string;
}

export function OnlineDB(options: OnlineDBCredentials) {
  const fs = require('fs');

  const datamodelXml = fs.readFileSync(options.dataModelPath, 'utf8');
  const schema = new DBSchema().loadXml(datamodelXml, {
    apiVersion: new Version('4.0')
  });
  const credentials = new ApiCredentials(options);

  const adapter = new JourneyAPIAdapter(credentials, schema, options.adapter);
  return new Database(schema, adapter);
}
