import { SchemaObjectDisplayExpression } from '../expressions/SchemaObjectDisplayExpression';
import { QueryType, ArrayType } from '@ja-platform/types';
// # schema module
// Parser for v2 and v3 of the schema XML.
import { FunctionExpression, FUNCTION_PREFIX } from '@ja-platform/evaluator';
import * as xml from '@ja-platform/core-xml';
import { FunctionType } from '../types/FunctionType';
import { Param } from '../types/Param';
import { Schema } from './Schema';
import { SchemaModelType } from '../types/SchemaModelType';
import { Type, ObjectType } from '@ja-platform/types';
import { ChoiceType, PrimitiveType, TextType, DateType, AttachmentType } from '../types/primitives';
import { Variable } from '../types/Variable';
import { ParseErrors } from '@ja-platform/parser-common';
import { XMLDocument, XMLElement } from '@journeyapps/domparser/types';
import { validateFieldName, validateModelName } from './reservedNames';
import { IndexDatabase, IndexDirection, ModelIndex, ModelIndexKey } from './ModelIndex';

/**
 * Normalize serialized parameter providers once at the schema boundary.
 */
export function parseParameterValueProvider(source: string): FunctionExpression {
  const code = source.trim().replace(/^\$:/, '');
  const call = /^[\w$]+(?:\.[\w$]+)*$/.test(code) ? `${code}()` : code;
  return FunctionExpression.parse(`${FUNCTION_PREFIX}${call}`);
}

function parseElement(element: XMLElement, definitions: any, errorHandler: ParseErrors) {
  const result = xml.parseElement(element, definitions);
  if (result.errors.length > 0) {
    errorHandler.pushErrors(result.errors);
  }
  return result;
}

const specs = xml.attribute.optionList(
  [
    'text',
    'text.email',
    'text.address',
    'text.name',
    'text.url',
    'text.paragraph',
    'number',
    'number.za_id',
    'phone',
    'phone.za_cell',
    'decimal',
    'password'
  ],
  'Invalid spec'
);

export const ATTACHMENT_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.anritsu',
  'application/vnd.valvelink',
  'application/xml',
  'text/plain',
  'text/csv',
  'any'
];

const v2AttributeDef = {
  name: xml.attribute.name,
  type: xml.attribute.notBlank,
  spec: specs,
  media: xml.attribute.optionList(
    ATTACHMENT_MEDIA_TYPES,
    "media must be 'any', or one of the specific allowed mime types."
  ),
  minValue: xml.attribute.notBlank,
  maxValue: xml.attribute.notBlank,
  label: xml.attribute.label,
  _required: ['name', 'type', 'label']
};

const deprecationWarning = {
  warning: 'Attribute is deprecated. Please remove or replace it.'
};

const v3AttributeDef = {
  name: xml.attribute.name,
  type: xml.attribute.notBlank,
  media: xml.attribute.optionList(
    ATTACHMENT_MEDIA_TYPES,
    "media must be 'any', or one of the specific allowed mime types."
  ),
  'auto-download': xml.attribute.optionList('true', 'false'),
  label: xml.attribute.label,
  _required: ['name', 'type', 'label'],
  'deprecated-spec': deprecationWarning,
  minValue: deprecationWarning,
  maxValue: deprecationWarning,
  spec: { warning: "'spec' is deprecated. Please remove or replace it." }
};

const v2VariableDef = {
  name: xml.attribute.name,
  type: xml.attribute.notBlank,
  spec: specs,
  media: xml.attribute.optionList(
    ATTACHMENT_MEDIA_TYPES,
    "media must be 'any', or one of the specific allowed mime types."
  ),
  minValue: xml.attribute.notBlank,
  maxValue: xml.attribute.notBlank,
  array: xml.attribute.optionList(['true', 'false']),
  _required: ['name', 'type']
};

const v3VariableDef = {
  name: xml.attribute.name,
  type: xml.attribute.notBlank,
  media: xml.attribute.optionList(
    ATTACHMENT_MEDIA_TYPES,
    "media must be 'any', or one of the specific allowed mime types."
  ),
  minValue: deprecationWarning,
  maxValue: deprecationWarning,
  _required: ['name', 'type']
};

const v5ParamArgDef = {
  name: xml.attribute.name,
  type: xml.attribute.notBlank
};

const v3ParameterDef = {
  name: xml.attribute.name,
  type: xml.attribute.notBlank,
  media: xml.attribute.optionList(
    ATTACHMENT_MEDIA_TYPES,
    "media must be 'any', or one of the specific allowed mime types."
  ),
  required: xml.attribute.optionList(['true', 'false']),
  'transform-value': xml.attribute.optionListWithFunctions([], FUNCTION_PREFIX),
  _required: ['name', 'type']
};

const v2PrimitiveMapping: { [index: string]: string } = {
  enum_set: PrimitiveType.MULTIPLE_CHOICE_INTEGER,
  enum: PrimitiveType.SINGLE_CHOICE_INTEGER,
  int: PrimitiveType.INTEGER,
  string: PrimitiveType.TEXT,
  attachment: PrimitiveType.ATTACHMENT,
  location: PrimitiveType.LOCATION,
  decimal: PrimitiveType.NUMBER,
  date: PrimitiveType.DATE,
  datetime: PrimitiveType.DATETIME
};

const v3SpecMapping: { [index: string]: string } = {
  email: 'text.email',
  address: 'text.address',
  name: 'text.name',
  url: 'text.url',
  paragraph: 'text.paragraph',
  'signed-number': 'number',
  number: 'number', // TODO: fix
  'south-african-id': 'number.za_id',
  'phone-number': 'phone',
  'decimal-number': 'decimal',
  password: 'password'
};

export const TEXT_SUBTYPES = Object.keys(v3SpecMapping);

const getAttribute = xml.getAttribute;

export interface ParseVersion {
  v3?: boolean;
  v3_1?: boolean;
}

export interface SchemaParser {
  parse: (rawxml: string) => void;
  parseField: (element: XMLElement, isVariable?: boolean) => Variable;
  validateVariableAttributes: (element: XMLElement, options?: { validateType?: boolean }) => void;
  parseObjectType: (element: XMLElement) => SchemaModelType;
  parseBelongsTo: (object: SchemaModelType, element: XMLElement) => void;
  parseDisplay: (object: SchemaModelType, element: XMLElement) => SchemaModelType;
  reset: () => void;
  getErrors: () => any[];
}

export function parser(schema: Schema, options?: { version?: ParseVersion; recordSource?: boolean }): SchemaParser {
  const errorHandler = new ParseErrors();
  options = options || {};

  let tag: {
    root: string;
    model: string;
    relatedModel: string;
    inverseOf: string;
    belongsTo: string;
    hasMany: string;
    field: string;
    optionKey: string;
  };

  let description: {
    field: string;
  };
  const version: ParseVersion = options.version || { v3: false, v3_1: false };

  const v3 = version.v3 === true;
  const v3p1 = version.v3_1 === true;
  const variableDef = v3 ? v3VariableDef : v2VariableDef;
  const parameterDef = v3ParameterDef;
  const attributeDef = v3 ? v3AttributeDef : v2AttributeDef;

  let optionDef: {
    option: any;
  };

  if (!v3) {
    tag = {
      root: 'schema',
      model: 'object',
      relatedModel: 'type',
      inverseOf: 'inverse_of',
      belongsTo: 'belongs_to',
      hasMany: 'has_many',
      field: 'attribute',
      optionKey: 'value'
    };
    description = {
      field: 'Attribute'
    };
    optionDef = { option: {} };
  } else {
    tag = {
      root: 'data-model',
      model: 'model',
      relatedModel: 'model',
      inverseOf: 'inverse-of',
      belongsTo: 'belongs-to',
      hasMany: 'has-many',
      field: 'field',
      optionKey: 'key'
    };
    description = {
      field: 'Field'
    };
    optionDef = { option: { key: xml.attribute.notBlank } };
    if (!v3p1) {
      tag.model = 'object';
      tag.relatedModel = 'type';
      optionDef = { option: { value: xml.attribute.notBlank } };
    }
  }

  function recordSource(on: { sourceElement: XMLElement | null } | null, source: XMLElement) {
    if (options.recordSource && on != null) {
      on.sourceElement = source;
    }
  }

  function parse(rawxml: string): XMLDocument {
    const xmlDoc = xml.parse(rawxml);
    schema.errors = xmlDoc.errors || [];
    errorHandler.pushErrors(schema.errors);
    if (schema.errors.length > 0) {
      // Stop parsing right here, and keep the previous version we parsed (if any).
      return;
    }

    const root = xmlDoc.documentElement;
    recordSource(schema, root);

    if (root == null) {
      errorHandler.pushError({ element: null, message: 'Not a valid XML document' });
      return; // fatal error
    }

    if (root.tagName != tag.root) {
      errorHandler.pushError({ element: root, message: `<${tag.root}> root tag expected` });
      return; // fatal error
    }

    // Validate that the only children are <object>
    let rootChildren = {
      [tag.model]: 1
    };
    errorHandler.pushErrors(xml.validateChildren(root, rootChildren));

    const objects = xml.children(root, tag.model);
    if (objects.length === 0) {
      errorHandler.pushError({ element: root, message: 'At least one model is required' });
    }

    schema.objects = {};

    // First pass - load the objects with attributes and display names
    objects.forEach(function (element) {
      const object = parseObjectType(element);
      if (object.name != null) {
        if (object.name in schema.objects) {
          const errorElement = xml.attributeNode(element, 'name') || element;
          errorHandler.pushError({ element: errorElement, message: "Model '" + object.name + "' is already defined" });
          errorHandler.pushErrors(object.errors);
        } else {
          schema.objects[object.name] = object;
        }
      } else {
        errorHandler.pushErrors(object.errors);
      }
    });

    // Second pass - load the belongs_to relationships
    objects.forEach(function (element) {
      const name = getAttribute(element, 'name');
      const object = schema.objects[name];
      if (object) {
        parseBelongsTo(object, element);
      }
    });

    // Third pass - load the has_many relationships and indexes
    objects.forEach(function (element) {
      const name = getAttribute(element, 'name');
      const object = schema.objects[name];
      if (object) {
        parseHasMany(object, element);
        parseIndexes(object, element);
      }
    });

    // Fourth pass - display and webhooks
    objects.forEach(function (element) {
      const name = getAttribute(element, 'name');
      const object = schema.objects[name];
      if (object) {
        parseDisplay(object, element);
        parseWebhooks(object, element);
        parseNotifications(object, element);
      }
    });
  }

  function parseObjectType(element: XMLElement) {
    const object = schema.newObjectType();
    recordSource(object, element);

    const modelDef = {
      [tag.model]: {
        name: xml.attribute.name,
        label: xml.attribute.label,
        classification: xml.attribute.optionList(['standard', 'sensitive']),
        _required: ['name', 'label']
      }
    };

    parseElement(element, modelDef, errorHandler);

    object.name = getAttribute(element, 'name');
    object.label = getAttribute(element, 'label');
    const validation = validateModelName(object.name);
    // Special case here: if name === null, we don't want to tell the user it's
    // a reserved name, since it's not specified at all.
    if (validation && object.name !== null) {
      errorHandler.pushError({
        element: xml.attributeNode(element, 'name'),
        message:
          validation == 'error'
            ? `Reserved model name '${object.name}'`
            : `'${object.name}' is reserved in some contexts and may cause issues.`,
        type: validation
      });
    }

    // the ordering of the elements (elements can share a number and be interchangeable)
    const allowedChildren = {
      [tag.field]: 1,
      [tag.belongsTo]: 2,
      [tag.hasMany]: 2,
      index: 3,
      display: 3,
      'notify-user': 3,
      webhook: 3
    };

    const orderMessage =
      'Elements must be in this order: ' + tag.field + 's, relationships, display, notify-user, indices, webhooks';

    const errors = xml.validateChildren(element, allowedChildren, orderMessage);
    errorHandler.pushErrors(errors);

    // Processes model attributes
    const attributes = xml.children(element, tag.field);
    attributes.forEach(function (attributeElement) {
      const variable = parseField(attributeElement, false);
      if (object.attributes.hasOwnProperty(variable.name)) {
        const errorElement = xml.attributeNode(attributeElement, 'name') || attributeElement;
        errorHandler.pushError({
          element: errorElement,
          message: description.field + " '" + variable.name + "' is already defined"
        });
      } else {
        object.addAttribute(variable);
      }
    });

    return object;
  }

  function parseDisplay(object: SchemaModelType, element: XMLElement) {
    const displayElements = xml.children(element, 'display');
    if (displayElements.length == 1) {
      const displayElement = displayElements[0];
      parseElement(
        displayElement,
        {
          display: {
            format: xml.attribute.label
          }
        },
        errorHandler
      );
      let attribute = true;
      let fmtString = getAttribute(displayElement, 'format');
      if (fmtString == null) {
        fmtString = displayElement.textContent;
        attribute = false;
      }
      object.displayFormat = SchemaObjectDisplayExpression.parse(fmtString);
      if (options.recordSource) {
        object.displaySource = displayElement;
      }
      const displayErrors = object.displayFormat.validate({
        getReference(path) {
          let type: Type = object;
          for (const field of path) {
            type = ObjectType.isInstanceOf(type) ? type.getField(String(field)) : null;
          }
          return type;
        }
      });
      displayErrors.forEach(function (error) {
        if (attribute) {
          errorHandler.pushError({
            element: xml.attributeValuePosition(displayElement, 'format', error.token.start, error.token.end),
            message: error.message
          });
        } else {
          errorHandler.pushError({
            element: xml.elementTextPosition(displayElement, error.token.start, error.token.end),
            message: error.message
          });
        }
      });
    } else if (displayElements.length === 0) {
      errorHandler.pushError({ element, message: '<display> is required' });
      object.displayFormat = SchemaObjectDisplayExpression.parse('');
    } else {
      errorHandler.pushError({
        element: displayElements[1],
        message: 'Only one <display> element is allowed',
        type: 'warning'
      });
    }

    return object;
  }

  function parseBelongsTo(object: SchemaModelType, element: XMLElement) {
    const syntax = {
      [tag.belongsTo]: {
        name: xml.attribute.name,
        [tag.relatedModel]: xml.attribute.notBlank,
        _required: [tag.relatedModel]
      }
    };

    xml.children(element, tag.belongsTo).forEach(function (e) {
      parseElement(e, syntax, errorHandler);

      try {
        const typeName = getAttribute(e, tag.relatedModel);
        let name = getAttribute(e, 'name');
        if (name == null || name === '') {
          name = typeName;
        }
        object.addBelongsTo({ name, type: typeName, schema });
        recordSource(object.belongsToVars[name], e);
      } catch (err) {
        const node = xml.attributeNode(e, err.attribute) || e;
        errorHandler.pushError({ element: node, message: err.message });
      }
    });
  }

  function parseHasMany(object: SchemaModelType, element: XMLElement) {
    const syntax = {
      [tag.hasMany]: {
        name: xml.attribute.name,
        [tag.inverseOf]: xml.attribute.notBlank,
        [tag.relatedModel]: xml.attribute.notBlank,
        _required: ['name', tag.relatedModel]
      }
    };

    xml.children(element, tag.hasMany).forEach(function (e) {
      parseElement(e, syntax, errorHandler);

      const typeName = getAttribute(e, tag.relatedModel);
      const name = getAttribute(e, 'name');

      const inverseOf = getAttribute(e, tag.inverseOf);

      if (typeName != null) {
        const objectType = schema.objects[typeName];
        if (objectType == null) {
          errorHandler.pushError({
            element: xml.attributeNode(e, tag.relatedModel) || e,
            message: "Object '" + typeName + "' is not defined"
          });
        } else {
          let rel = null;
          if (inverseOf != null) {
            rel = objectType.belongsTo[inverseOf];
            if (rel == null) {
              errorHandler.pushError({
                element: xml.attributeNode(e, tag.inverseOf),
                message: "'" + inverseOf + "' is not defined on '" + objectType.name + "'"
              });
            }
          } else {
            const candidates = [];
            for (let key in objectType.belongsTo) {
              if (objectType.belongsTo.hasOwnProperty(key)) {
                const r = objectType.belongsTo[key];
                if (r.foreignType === object) {
                  candidates.push(r);
                }
              }
            }
            if (candidates.length == 1) {
              rel = candidates[0];
            } else if (candidates.length === 0) {
              errorHandler.pushError({
                element: e,
                message:
                  'Need <' +
                  tag.belongsTo +
                  ' ' +
                  tag.relatedModel +
                  '="' +
                  object.name +
                  '"> in object \'' +
                  objectType.name +
                  "'"
              });
            } else {
              const names = [];
              for (let i = 0; i < candidates.length; i++) {
                names.push(candidates[i].name);
              }
              errorHandler.pushError({
                element: e,
                message: 'Ambiguous ' + e.tagName + ' - set ' + tag.inverseOf + ' to one of ' + names.join(', ')
              });
            }
          }

          if (rel != null) {
            if (object.hasMany.hasOwnProperty(name)) {
              errorHandler.pushError({
                element: xml.attributeNode(e, 'name') || e,
                message: "Relationship '" + name + "' is already defined"
              });
            } else if (rel.foreignName != null) {
              errorHandler.pushError({
                element: e,
                message: "Relationship '" + rel.name + "' already has a " + e.tagName + " '" + rel.foreignName + "'"
              });
            } else {
              rel.foreignName = name;

              object.hasMany[name] = rel;
              object.hasManyVars[name] = schema.variable(name, new QueryType(objectType));
              recordSource(object.hasManyVars[name], e);
            }
          }
        }
      }
    });
  }

  function parseWebhooks(object: SchemaModelType, element: XMLElement) {
    const syntax = {
      webhook: {
        name: xml.attribute.name,
        type: xml.attribute.notBlank,
        receiver: xml.attribute.any, // pdfmailer|cloudcode|<none>
        action: xml.attribute.any, // template |task   |<n/a>
        // Fixme: this looks wrong.
        field: {
          name: xml.attribute.name,
          required: xml.attribute.notBlank,
          embed: xml.attribute.notBlank,
          state: xml.attribute.notBlank,
          _required: ['name']
        },
        _required: ['type']
      }
    };

    xml.children(element, 'webhook').forEach(function (webhookElement) {
      parseElement(webhookElement, syntax, errorHandler);

      let webhook = {
        name: getAttribute(webhookElement, 'name'),
        type: getAttribute(webhookElement, 'type'),
        receiver: getAttribute(webhookElement, 'receiver'),
        action: getAttribute(webhookElement, 'action'),
        fields: [] as any[],
        sourceElement: null as XMLElement
      };
      recordSource(webhook, webhookElement);

      if (webhook.type != 'ready' && webhook.type != 'update') {
        errorHandler.pushError({
          element: xml.attributeNode(webhookElement, 'type') || webhookElement,
          message: 'webhook type must be "ready" or "update"'
        });
      }

      if (webhook.receiver == null) {
        if (webhook.name == null) {
          webhook.name = object.name + '_' + webhook.type;
        }

        if (webhook.action != null) {
          errorHandler.pushError({
            element: xml.attributeNode(webhookElement, 'action') || webhookElement,
            message: 'webhook action is not allowed unless receiver is specified'
          });
        }
      } else {
        if (webhook.receiver != 'pdfmailer' && webhook.receiver != 'cloudcode') {
          errorHandler.pushError({
            element: xml.attributeNode(webhookElement, 'receiver') || webhookElement,
            message: 'webhook receiver must be "cloudcode" or "pdfmailer" when specified'
          });
        }

        if (webhook.action == null || webhook.action == '') {
          errorHandler.pushError({
            element: webhookElement,
            message: 'webhook action required when receiver is specified'
          });
        }

        if (webhook.name == null) {
          // pdfmailer: pdfmailer_notification_ready_delivery_note

          webhook.name = webhook.receiver + '_' + object.name + '_' + webhook.type + '_' + webhook.action;
        }
      }

      const booleanMapping: { [index: string]: boolean | undefined } = {
        true: true,
        false: false,
        null: true,
        '': true
      };

      // iterate through all fields in webhook
      xml.children(webhookElement, 'field').forEach(function (fieldElement) {
        const fieldName = getAttribute(fieldElement, 'name');
        // TODO: validate 'name'

        const fieldRequiredText = getAttribute(fieldElement, 'required');
        // 'required' defaults to true if not provided
        const fieldRequired = booleanMapping[fieldRequiredText];
        if (fieldRequired == null) {
          errorHandler.pushError({
            element: xml.attributeNode(fieldElement, 'required') || fieldElement,
            message: 'required must be "true" or "false"'
          });
        }

        const fieldEmbedText = getAttribute(fieldElement, 'embed');
        // 'embed' defaults to true if not provided
        const fieldEmbed = booleanMapping[fieldEmbedText];
        if (fieldEmbed == null) {
          errorHandler.pushError({
            element: xml.attributeNode(fieldElement, 'embed') || fieldElement,
            message: 'embed must be "true" or "false"'
          });
        }

        let fieldState = getAttribute(fieldElement, 'state');
        // 'state' defaults to 'present' if not provided
        if (fieldState == null) {
          fieldState = 'present';
        }
        if (fieldState != 'present' && fieldState != 'uploaded') {
          errorHandler.pushError({
            element: xml.attributeNode(fieldElement, 'state') || fieldElement,
            message: 'state must be "present" or "uploaded"'
          });
        }

        const field = {
          name: fieldName,
          required: fieldRequired,
          embed: fieldEmbed,
          state: fieldState
        };
        webhook.fields.push(field);
      });

      object.webhooks.push(webhook);
    });
  }

  function parseNotifications(object: SchemaModelType, element: XMLElement) {
    const syntax = {
      'notify-user': {
        message: xml.attribute.notBlank,
        'received-field': xml.attribute.notBlank,
        'recipient-field': xml.attribute.notBlank,
        'badge-count-field': xml.attribute.notBlank
      },
      _required: ['message', 'received-field', 'recipient-field']
    };

    xml.children(element, 'notify-user').forEach(function (notificationElement) {
      parseElement(notificationElement, syntax, errorHandler);

      const notifyUserObject = {
        message: SchemaObjectDisplayExpression.parse(getAttribute(notificationElement, 'message')),
        recipient: getAttribute(notificationElement, 'recipient-field'),
        received: getAttribute(notificationElement, 'received-field'),
        badgeCount: getAttribute(notificationElement, 'badge-count-field')
      };

      object.notifyUsers.push(notifyUserObject);
    });
  }

  function parseIndexes(object: SchemaModelType, element: XMLElement) {
    const indexDef = {
      index: {
        name: xml.attribute.name,
        on: xml.attribute.notBlank,
        database: xml.attribute.notBlank,
        _required: ['on']
      }
    };

    xml.children(element, 'index').forEach(function (e) {
      parseElement(e, indexDef, errorHandler);

      const onAttribute = getAttribute(e, 'on');
      let name = getAttribute(e, 'name');
      const on = onAttribute.split(',');
      let keys: ModelIndexKey[] = [];
      for (let key of on) {
        let dir: IndexDirection;
        if (key.startsWith('-')) {
          key = key.substring(1);
          dir = IndexDirection.DESCENDING;
        } else {
          dir = IndexDirection.ASCENDING;
        }
        const fieldType = object.attributes[key] || object.belongsToVars[key];
        if (!fieldType) {
          errorHandler.pushError({
            element: xml.attributeNode(e, 'on') || e,
            message: "Undefined field or model in index: '" + key + "'"
          });
        } else if (['attachment', 'multiple-choice', 'multiple-choice-integer'].indexOf(fieldType.type.name) >= 0) {
          errorHandler.pushError({
            element: xml.attributeNode(e, 'on') || e,
            message: "Field is not indexable: '" + key + "'"
          });
        }
        keys.push({
          dir,
          field: key
        });
      }
      if (name == null) {
        name = keys.map((key) => key.field).join('_');
      }
      const databaseAttribute = getAttribute(e, 'database');
      let databases: IndexDatabase[] = [IndexDatabase.APP, IndexDatabase.CLOUD];
      if (databaseAttribute) {
        databases = databaseAttribute.split(',') as IndexDatabase[];
        for (let db of databases) {
          if ([IndexDatabase.APP, IndexDatabase.CLOUD].indexOf(db) == -1) {
            errorHandler.pushError({ element: xml.attributeNode(e, 'database'), message: `Invalid database: ${db}` });
          }
        }
      }
      const index: ModelIndex = {
        on, // Deprecated, since this doesn't support IndexDirection.
        keys,
        name,
        databases
      };
      object.allIndexes.push(index);
      if (index.databases.indexOf(IndexDatabase.APP) >= 0) {
        object.indexes.push(index);
      }
    });
  }

  function parseIntegerOptions(type: Type, element: XMLElement) {
    if (!ChoiceType.isInstanceOf(type)) {
      throw new Error('Integer options can only be used with choice types');
    }
    let index = 0;
    let largest = -1;
    xml.children(element, 'option').forEach(function (e) {
      parseElement(e, optionDef, errorHandler);
      const valueText = getAttribute(e, tag.optionKey);
      const value = valueText == null ? largest + 1 : parseInt(valueText, 10);
      const label = e.textContent;
      try {
        let enumOption = type.addOption(value, label, index);
        recordSource(enumOption, e);
      } catch (err) {
        errorHandler.pushError({ element: xml.attributeNode(e, tag.optionKey) || e, message: err.message });
      }
      index++;
      largest = Math.max(largest, value);
    });
  }

  function parseStringOptions(type: Type, element: XMLElement) {
    if (!ChoiceType.isInstanceOf(type)) {
      throw new Error('String options can only be used with choice types');
    }
    let index = 0;
    xml.children(element, 'option').forEach(function (e) {
      parseElement(e, optionDef, errorHandler);
      const value = getAttribute(e, tag.optionKey);
      const label = e.textContent;
      try {
        let enumOption = type.addOption(value, label, index);
        recordSource(enumOption, e);
        index++;
      } catch (err) {
        errorHandler.pushError({ element: xml.attributeNode(e, tag.optionKey) || e, message: err.message });
      }
    });
  }

  function parseBooleanOptions(type: Type, element: XMLElement) {
    if (!ChoiceType.isInstanceOf(type)) {
      throw new Error('Boolean options can only be used with choice types');
    }
    let index = 0;
    xml.children(element, 'option').forEach(function (e) {
      parseElement(e, optionDef, errorHandler);
      const valueText = getAttribute(e, tag.optionKey);
      const value = ({ true: true, false: false } as any)[valueText];
      const label = e.textContent;
      if (value != null) {
        try {
          let enumOption = type.addOption(value, label, index);
          recordSource(enumOption, e);
          index++;
        } catch (err) {
          errorHandler.pushError({ element: xml.attributeNode(e, tag.optionKey) || e, message: err.message });
        }
      } else {
        errorHandler.pushError({
          element: xml.attributeNode(e, tag.optionKey) || e,
          message: 'key must be "true" or "false"'
        });
      }
    });
    if (Object.keys(type.options).length === 0) {
      type.addOption(false, 'No', 0);
      type.addOption(true, 'Yes', 1);
    }
    if (Object.keys(type.options).length != 2) {
      errorHandler.pushError({ element, message: 'A boolean must contain exactly two options.' });
    }
  }

  /**
   * Validate declaration attributes independently of resolving their type.
   * A caller validating type expressions separately can omit the type attribute checks.
   */
  function validateVariableAttributes(element: XMLElement, options: { validateType?: boolean } = {}) {
    const definition = element.tagName === 'param' ? parameterDef : variableDef;
    parseElement(
      element,
      {
        [element.tagName]:
          options.validateType === false
            ? {
                ...definition,
                type: xml.attribute.any,
                _required: definition._required.filter((name) => name !== 'type')
              }
            : definition
      },
      errorHandler
    );
  }

  function parseField(element: XMLElement, isVariable: boolean) {
    const isParam = element.tagName == 'param';

    const variable: Variable | Param = isParam ? schema.param() : schema.variable();

    recordSource(variable, element);

    if (isVariable) {
      validateVariableAttributes(element);
    } else {
      parseElement(
        element,
        {
          attribute: attributeDef,
          field: attributeDef
        },
        errorHandler
      );
    }

    variable.name = getAttribute(element, 'name');
    variable.label = getAttribute(element, 'label');

    if (isParam) {
      const requiredAttr = getAttribute(element, 'required');
      (variable as Param).required = requiredAttr != null ? requiredAttr !== 'false' : true;
      const provider = getAttribute(element, 'transform-value');
      if (provider != null) {
        (variable as Param).provideValue = parseParameterValueProvider(provider);
      }
    }

    const originalTypeName = getAttribute(element, 'type');
    variable.sourceTypeName = originalTypeName; // Useful for debugging info

    let typeName = originalTypeName;
    let subType = null;

    if (originalTypeName != null) {
      const colon = originalTypeName.indexOf(':');
      if (colon >= 0 && v3) {
        typeName = originalTypeName.substring(0, colon);
        subType = originalTypeName.substring(colon + 1);
      }
    }

    if (!isVariable) {
      const validation = validateFieldName(variable.name);
      if (validation) {
        errorHandler.pushError({
          element: xml.attributeNode(element, 'name'),
          message: `Reserved field name '${variable.name}'`,
          type: validation
        });
      } else if (variable.name != null && variable.name.slice(-3) === '_id') {
        errorHandler.pushError({
          element: xml.attributeNode(element, 'name'),
          message: "Field name should not end with '_id'",
          type: 'warning'
        });
      }
    }

    let query = false;
    let array = false;

    if (isVariable) {
      if (v3 && typeName == 'query') {
        query = true;
        typeName = subType;
      } else if (v3 && typeName == 'array') {
        array = true;
        typeName = subType;
      } else if (!v3 && getAttribute(element, 'array') == 'true') {
        query = true;
      }
    }

    let primitiveType = null;

    if (v3) {
      if (!v3p1 && typeName == 'decimal') {
        typeName = PrimitiveType.NUMBER;
      }
      primitiveType = schema.primitive(typeName);
    } else {
      if (typeName in v2PrimitiveMapping) {
        typeName = v2PrimitiveMapping[typeName];
        primitiveType = schema.primitive(typeName);
      } else {
        primitiveType = null;
      }
    }

    if (
      typeName == PrimitiveType.SINGLE_CHOICE_INTEGER ||
      typeName == PrimitiveType.MULTIPLE_CHOICE_INTEGER ||
      typeName == PrimitiveType.SINGLE_CHOICE ||
      typeName == PrimitiveType.MULTIPLE_CHOICE ||
      typeName == PrimitiveType.BOOLEAN
    ) {
      errorHandler.pushErrors(xml.validateChildren(element, { option: 1 }));
    } else {
      errorHandler.pushErrors(xml.validateChildren(element, { arg: 1 }));
    }

    if (primitiveType == null && isVariable) {
      const objectType = schema.getType(typeName);
      if (objectType != null) {
        if (query) {
          variable.type = new QueryType(objectType);
        } else if (array) {
          variable.type = new ArrayType(objectType);
        } else {
          variable.type = objectType;
        }
      } else if (isParam && typeName == FunctionType.TYPE) {
        const functionType = schema.functionType();
        xml.children(element, FunctionType.ARG_TAG).forEach((child) => {
          const result = parseElement(child, { arg: v5ParamArgDef }, errorHandler);
          if (result.errors.length == 0) {
            functionType.addArgument(
              schema.variable(getAttribute(child, 'name'), schema.getType(getAttribute(child, 'type')))
            );
          }
        });
        variable.type = functionType;
      }
    } else if (primitiveType != null) {
      variable.type = primitiveType;
      if (TextType.isInstanceOf(variable.type)) {
        variable.type.spec = getAttribute(element, 'spec');

        if (v3 && subType) {
          variable.type.subType = subType;

          // For backwards compatibility
          variable.type.spec = v3SpecMapping[subType];

          if (variable.type.spec == null) {
            errorHandler.pushError({
              element: xml.attributeNode(element, 'type'),
              message: "'" + subType + "' is not a valid string format"
            });
          }
        }
      } else if (DateType.isInstanceOf(variable.type)) {
        variable.type.isDay = v3p1 ? true : false;
      } else if (typeName == 'single-choice-integer' || typeName == 'multiple-choice-integer') {
        parseIntegerOptions(variable.type, element);
      } else if (typeName == 'single-choice' || typeName == 'multiple-choice') {
        parseStringOptions(variable.type, element);
      } else if (typeName == 'boolean') {
        parseBooleanOptions(variable.type, element);
      } else if (originalTypeName == 'attachment' && AttachmentType.isInstanceOf(variable.type)) {
        variable.type.media = getAttribute(element, 'media');
        if (variable.type.media == null) {
          if (v3) {
            errorHandler.pushError({
              element,
              message: 'Include media="" with a specific mime type, or media="any" for any of the allowed types.'
            });
          } else {
            errorHandler.pushError({
              element,
              message: 'Include media="image/svg+xml" (signature) or "image/jpeg" (picture)'
            });
          }
        }
        // parseElement validates the allowed values when the element is present
      }
    }

    if (variable.type != null && AttachmentType.isInstanceOf(variable.type)) {
      variable.type.autoDownload = getAttribute(element, 'auto-download') == 'true';
    }

    if (variable.type == null) {
      if (xml.attributeNode(element, 'type') != null && typeName !== '') {
        errorHandler.pushError({
          element: xml.attributeNode(element, 'type'),
          message: "Invalid type '" + originalTypeName + "'"
        });
      } else {
        // This case is covered by parseElement().
      }
    }

    return variable;
  }

  function reset() {
    errorHandler.reset();
  }

  function getErrors() {
    return errorHandler.getErrors();
  }

  return {
    parse,
    parseField,
    validateVariableAttributes,
    parseObjectType,
    parseBelongsTo,
    parseDisplay,
    reset,
    getErrors
  };
}

/**
 * Apply serialized field metadata to a variable whose type is already resolved.
 */
export function applyVariableMetadata(variable: Variable, attributeData: any) {
  variable.label = attributeData.label;

  if (attributeData.spec && TextType.isInstanceOf(variable.type)) {
    variable.type.spec = attributeData.spec;
  }

  if (attributeData.subType && TextType.isInstanceOf(variable.type)) {
    variable.type.subType = attributeData.subType;
  }

  if (DateType.isInstanceOf(variable.type)) {
    variable.type.isDay = !!attributeData.isDay;
  }

  if (attributeData.options && ChoiceType.isInstanceOf(variable.type)) {
    for (let optionData of attributeData.options) {
      variable.type.addOption(optionData.value, optionData.label, optionData.index);
    }
  }
  return variable;
}

export function parseJsonVariable(schema: Schema, attributeName: string, attributeData: any) {
  if (attributeData.type == 'query') {
    return schema.variable(attributeName, new QueryType(schema.getType(attributeData.object)));
  } else if (attributeData.type == 'array') {
    return schema.variable(attributeName, new ArrayType(schema.getType(attributeData.object)));
  } else {
    const variable = schema.variable(attributeName, attributeData.type);
    if (attributeData.required != null) {
      (variable as Param).required = attributeData.required;
    }
    if (attributeData.provideValue != null) {
      (variable as Param).provideValue = parseParameterValueProvider(attributeData.provideValue);
    }
    return applyVariableMetadata(variable, attributeData);
  }
}

// Schema-free variable parsing
// Used for indexes
export function parseJsonField(schema: Schema, attributeData: any) {
  const type = schema.primitive(attributeData.type);
  let variable = schema.variable(attributeData.name, type);
  if (attributeData.relationship) {
    variable.relationship = attributeData.relationship;
    variable.isRelationshipId = attributeData.isRelationshipId;
  }
  return applyVariableMetadata(variable, attributeData);
}

export function jsonParser(schema: Schema) {
  // Structure:
  // {
  //   objects: {
  //      "asset": {
  //          attributes: {
  //             "serial_number": {
  //                 type: "string",
  //                 spec: "number",
  //             },
  //             ...,
  //          },
  //          belongsTo: {
  //             "owner": {
  //               type: "person",
  //               foreignName: "assets"
  //             },
  //             ...
  //          },
  //          display: "A {serial_number}",
  //      },
  //      ...
  //   }
  // }
  function parse(data: any) {
    schema.objects = {};

    // First pass - load the objects with attributes and display names
    Object.keys(data.objects).forEach(function (name) {
      const objectData = data.objects[name];
      const object = schema.newObjectType();
      object.name = name;
      object.label = objectData.label;
      object.displayFormat = SchemaObjectDisplayExpression.parse(objectData.display);

      Object.keys(objectData.attributes).forEach(function (attributeName) {
        const attributeData = objectData.attributes[attributeName];
        const variable = parseJsonVariable(schema, attributeName, attributeData);
        object.addAttribute(variable);
      });

      schema.objects[object.name] = object;
    });

    Object.keys(data.objects).forEach(function (name) {
      const objectData = data.objects[name];
      const object = schema.objects[name];

      Object.keys(objectData.belongsTo).forEach(function (relName) {
        const relData = objectData.belongsTo[relName];
        const rel = object.addBelongsTo({
          name: relName,
          type: relData.type,
          schema,
          foreignName: relData.foreignName
        });
      });
    });
  }

  return {
    parse
  };
}
