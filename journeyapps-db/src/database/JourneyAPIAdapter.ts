import 'isomorphic-fetch';
import { retryableFetch } from '../utils/retryableFetch';
import type { Response, RequestInit } from 'node-fetch';
import { BaseAdapter } from './adapters/BaseAdapter';
import { Variable, Relationship } from '@ja-platform/parser-schema';
import { Version } from '@ja-platform/parser-common';
import { Query } from '../query/Query';
import { ExecuteBatchOperation } from './Batch';
import { ObjectData, PersistedObjectData } from '../types/ObjectData';
import { ApiCredentials } from '../credentials';
import { Operation } from '../query/queryOperations';
import { ObjectType } from '../types/ObjectType';
import { DBSchema } from '../Schema';

export type { Response, RequestInit } from 'node-fetch';

const forEach = require('lodash/each'); // tslint:disable-line
const tail = require('lodash/tail'); // tslint:disable-line

interface CrudAction {
  method: 'put' | 'patch' | 'delete';
  object: {
    type: string;
    id: string;
  };
}

interface CrudOperationResponse {
  error: any;
}

interface CrudResponse {
  operations: CrudOperationResponse[];
}

export interface ApiObjectData extends ObjectData {
  _updated_at?: string;
  display?: string;
}

export interface ApiAdapterOptions {
  fetch?: RequestInit;
}

export class JourneyAPIAdapter extends BaseAdapter {
  static apiToInternalFormat(type: ObjectType, apiObj: any) {
    const dbObj: ApiObjectData = {
      id: apiObj.id,
      type: type.name,
      _updated_at: apiObj.updated_at,
      display: apiObj.display,
      attributes: {},
      belongs_to: {}
    };

    forEach(type.attributes, function (attr: Variable) {
      const name = attr.name;
      if (attr.type.name == 'attachment') {
        if (apiObj[name + '_id']) {
          const attachment = {
            id: apiObj[name + '_id'],
            state: 'pending',
            urls: {} as { [key: string]: string }
          };
          if (apiObj[name]) {
            // The URL here is only present if state == 'uploaded', so the following
            // two are equivalent:
            //   { photo_id: '...', photo: {state: 'pending' } }
            //   { photo_id: '...' }
            // In the Attachment class, the present() function checks `url != null`,
            // which is false in both the above cases.
            attachment.state = apiObj[name].state;
            // Possible keys at time of writing: original, fullscreen, thumbnail
            // To account for future additions, we accept any url-like value.
            forEach(apiObj[name], function (attributeValue: any, key: string) {
              const isUrl = attributeValue != null && /https?\:\/\//.test(attributeValue);
              if (key != 'state' && isUrl) {
                attachment.urls[key] = attributeValue;
              }
            });
          }
          dbObj.attributes[name] = attachment;
        }
      } else if (attr.type.hasOptions) {
        const value = apiObj[name];
        if (attr.type.multipleOptions) {
          const array: any[] = [];
          if (value) {
            value.forEach(function (val: any) {
              array.push(val.key);
            });
          }
          dbObj.attributes[name] = array;
        } else {
          dbObj.attributes[name] = value ? value.key : null;
        }
      } else {
        dbObj.attributes[name] = apiObj[name];
      }
    });

    forEach(type.belongsTo, function (rel: Relationship) {
      const name = rel.name;
      dbObj.belongs_to[name] = apiObj[name + '_id'];
    });

    return dbObj;
  }

  name: string = 'api';
  serializeOptions = {
    inlineAttachments: true
  };

  schema: DBSchema;
  options: ApiAdapterOptions;
  credentials: ApiCredentials;

  constructor(credentials: ApiCredentials, schema: DBSchema, options: ApiAdapterOptions = {}) {
    super();

    this.schema = schema;

    this.options = options;
    this.credentials = credentials;
  }

  description() {
    return 'JourneyAPI';
  }

  async executeQuery(query: Query): Promise<ObjectData[]> {
    let results: ObjectData[] = [];
    const userSpecifiedLimit = query.limitNumber;
    const allResults = await this.executeQueryGetMore(query, results, userSpecifiedLimit);
    return allResults;
  }

  async get(type: string, id: string): Promise<ObjectData> {
    if (id == null) {
      return null;
    }
    const url = this.credentials.api4Url() + 'objects/' + type + '/' + id + '.json';
    try {
      const result = await this.apiGet(url);
      return JourneyAPIAdapter.apiToInternalFormat(this.schema.objects[type], result);
    } catch (error) {
      if (error.type == 'OBJECT_NOT_FOUND') {
        return null;
      } else {
        throw error;
      }
    }
  }

  async getAll(type: string, ids: string[]): Promise<ObjectData[]> {
    const model = this.schema.getType(type);
    let result: ObjectData[] = [];
    // This is more efficient batching than relying on limit and skip.
    for (let i = 0; i < ids.length; i += this.batchLimit) {
      const idBatch = ids.slice(i, i + this.batchLimit);
      result = result.concat(await this.getIdBatch(model, idBatch));
    }
    return result;
  }

  private async getIdBatch(model: ObjectType, ids: string[]) {
    const idAttr = model.getAttribute('id');
    const query = new Query(
      this,
      model,
      new Operation(
        idAttr,
        'in',
        ids.filter((id) => id != null)
      )
    );
    const results = await this.executeQuery(query);
    const resultMap: Record<string, ObjectData> = {};
    for (let result of results) {
      resultMap[result.id] = result;
    }
    return ids.map((id) => {
      return resultMap[id] ?? null;
    });
  }

  async applyBatch(crud: ExecuteBatchOperation[]) {
    const actions: CrudAction[] = [];
    for (let i = 0; i < crud.length; i++) {
      const operation = crud[i];
      const action = operation.op;
      if (action == 'put') {
        actions.push({
          method: 'put',
          object: dbToApiObject(this.schema.getType(operation.type), operation.id, operation.data)
        });
      } else if (action == 'patch') {
        actions.push({
          method: 'patch',
          object: dbToApiObject(this.schema.getType(operation.type), operation.id, operation.patch)
        });
      } else if (action == 'delete') {
        actions.push({
          method: 'delete',
          object: {
            type: operation.type,
            id: operation.id
          }
        });
      } else {
        throw new Error('Unknown action: ' + action);
      }
    }

    // 4xx / 5xx errors are passed through
    const response = await this.postCrud(actions);
    if (response.operations.length != crud.length) {
      throw new Error(
        'Internal error - invalid results received from server. Expected ' +
          crud.length +
          ' results, got ' +
          response.operations.length
      );
    }
    let results = [];
    for (let j = 0; j < crud.length; j++) {
      let error = response.operations[j].error;
      if (crud[j].op == 'delete' && error != null && error.type == 'OBJECT_NOT_FOUND') {
        // For idempotency, we ignore these.
        error = null;
      }
      let result = {
        error: error
      };
      results.push(result);
    }
    return results;
  }

  public async loadDataModel(): Promise<void> {
    const response = await retryableFetch(this.credentials.api4Url() + 'datamodel.xml', {
      headers: {
        Accept: 'application/xml',
        ...this.credentials.apiAuthHeaders()
      }
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const xml = await response.text();

    this.schema = new DBSchema();
    this.schema.loadXml(xml, { apiVersion: new Version('4.0') });
  }

  public apiGet(url: string): Promise<any> {
    const getOptions = {
      method: 'GET',
      headers: Object.assign(
        {
          Accept: 'application/json'
        },
        this.credentials.apiAuthHeaders()
      )
    };
    return retryableFetch(url, {
      ...this.options.fetch,
      ...getOptions
    }).then(responseHandler);
  }

  private apiPost(url: string, data: any): Promise<any> {
    const postOptions = {
      method: 'POST',
      headers: Object.assign(
        {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        this.credentials.apiAuthHeaders()
      ),
      body: JSON.stringify(data)
    };
    return retryableFetch(url, {
      ...this.options.fetch,
      ...postOptions
    }).then(responseHandler);
  }

  /**
   * Post crud actions.
   *
   * @param {*} actions - array of actions
   */
  private postCrud(actions: CrudAction[]): Promise<CrudResponse> {
    // TODO: make this work for mobile credentials as well
    const url = this.credentials.api4Url() + 'batch.json';
    const body = {
      operations: actions
    };
    return this.apiPost(url, body);
  }

  // FIXME: DB.user.all().orderBy("-name").limit(1).toArray() is a Retrieve All Objects query, which returns "more: true" despite the limit.
  private doApiQuery(query: Query) {
    const typeName = query.type.name;
    const original = query.expression.toOriginalExpression();
    const queryExpression = original[0];
    const queryArguments = tail(original);
    let url;

    // empty query expressions - eg. DB.user.all() - must use the standard API 'retrieve all objects' method.
    if (typeof queryExpression == 'undefined' || queryExpression == '') {
      url = this.credentials.api4Url() + 'objects/' + typeName + '.json';
      const limitUrl = 'limit=' + (query.limitNumber && query.limitNumber > 0 ? query.limitNumber : '');
      const skipUrl = 'skip=' + (query.skipNumber && query.skipNumber > 0 ? query.skipNumber : '');
      const sortUrl = serializeSortCriteriaToUriEncoding(sortingCriteria(query.ordering), 'sort');
      url += '?' + [limitUrl, skipUrl, sortUrl].join('&');
      return this.apiGet(url);
    } else {
      url = this.credentials.api4Url() + 'objects/' + typeName + '/query.json';
      const queryBody = {
        expression: queryExpression,
        arguments: queryArguments,
        limit: query.limitNumber && query.limitNumber > 0 ? query.limitNumber : null,
        skip: query.skipNumber && query.skipNumber > 0 ? query.skipNumber : null,
        sort: query.ordering
      };
      return this.apiPost(url, queryBody);
    }
  }

  private async executeQueryGetMore(
    query: Query,
    results?: ObjectData[],
    originalLimit?: number
  ): Promise<ObjectData[]> {
    const data = await this.doApiQuery(query);
    forEach(data.objects, function (obj: any) {
      results.push(JourneyAPIAdapter.apiToInternalFormat(query.type, obj));
    });
    // If the user specified a limit (originalLimit), the result length should never be > originalLimit, but
    // just in case something weird happens, use >= to terminate the loop.
    if (!data.more || (originalLimit && results.length >= originalLimit)) {
      return results;
    } else {
      // Always use the number of returned objects as the limit for the next batch. This handles server-side default/max limits.
      let limit = data.objects.length;

      // For the last batch, fetch only the remainder. ie. don't over-run the originalLimit.
      if (originalLimit && results.length + limit > originalLimit) {
        limit = originalLimit % limit;
      }

      // Do not modify original query
      query = query.limit(limit).skip((query.skipNumber || 0) + limit);

      return this.executeQueryGetMore(query, results, originalLimit);
    }
  }
}

function responseHandler(response: Response): Promise<any> {
  if (response.ok) {
    return response.json();
  } else {
    return response.text().then(function (text) {
      let error = new Error('HTTP Error ' + response.status + ': ' + response.statusText + '\n' + text);
      Object.defineProperty(error, 'body', { value: text });
      Object.defineProperty(error, 'status', { value: response.status });

      try {
        let body = JSON.parse(text);
        Object.defineProperty(error, 'type', { value: body.type });
      } catch (err) {
        // Not JSON - Ignore
      }

      return Promise.reject(error);
    });
  }
}

// Returns a hash with sort keys and directions. Adapted from Journey Runtime's database._sort
function sortingCriteria(ordering: string[]) {
  let criteria: any = {};
  criteria.__orderedProperties = [];
  for (let attribute of ordering) {
    let ascending = 1;
    if (attribute[0] == '-') {
      ascending = -1;
      attribute = attribute.substring(1);
    }
    criteria[attribute] = ascending;
    criteria.__orderedProperties.push(attribute);
  }
  return criteria;
}

// Expects sortingCriteria.__orderedProperties to be an array.
function serializeSortCriteriaToUriEncoding(criteria: any, prefix?: string) {
  let str: string[] = [];
  forEach(criteria.__orderedProperties, function (p: string) {
    if (criteria.hasOwnProperty(p)) {
      const k = prefix ? prefix + '[' + p + ']' : p;
      const v = criteria[p];
      str.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  });
  return str.join('&');
}

function dbToApiObject(type: ObjectType, id: string, dbObj: PersistedObjectData) {
  let apiObj: any = {
    type: type.name,
    id: id
  };

  for (let key of Object.keys(dbObj.attributes)) {
    const value = dbObj.attributes[key];
    const attrType = type.getAttribute(key)?.type;
    if (attrType?.name == 'attachment') {
      if (value?.id) {
        apiObj[`${key}_id`] = value.id;
      } else {
        apiObj[key] = value;
      }
    } else {
      apiObj[key] = value;
    }
  }

  for (let key of Object.keys(dbObj.belongs_to)) {
    apiObj[`${key}_id`] = dbObj.belongs_to[key];
  }

  return apiObj;
}
