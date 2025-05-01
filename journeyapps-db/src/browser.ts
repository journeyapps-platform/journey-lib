import * as database from './database/Database';
import * as query from './query/queryOperations';

// Convenience export
export { Day } from '@journeyapps/core-date';
export { Variable } from '@journeyapps/parser-schema';

/**
 * @deprecated
 */
export { database, query };

export * from './credentials/ApiCredentials';
export * from './credentials/MobileCredentials';

export * from './Schema';

export * from './types/primitives';

export * from './types/Type';
export * from './types/GenericObject';
export * from './types/ObjectData';
export * from './types/ObjectType';
export * from './types/ArrayType';
export * from './types/QueryType';
export * from './types/Location';
export { Attachment } from './types/Attachment';

export * from './database/Batch';
export * from './database/Database';
export * from './database/Collection';
export * from './database/DatabaseObject';
export * from './database/adapters/BaseAdapter';
export * from './database/GenericDatabase';
export * from './database/JourneyAPIAdapter';
export * from './database/adapters/DatabaseAdapter';
export * from './database/adapters/WebSQLAdapter';

export * from './query/Query';
export * from './query/InternalQuery';

export * from './utils/base64';
export * from './utils/FunctionQueue';

export { Promise } from './utils/JourneyPromise';
