import { Schema } from './Schema';
import { setAttributes, OrderedIncrementalUpdater } from '@ja-platform/core-xml';
import { XMLElement, XMLDocument } from '@journeyapps/domparser/types';
import * as xml from '@ja-platform/core-xml';
import { Variable } from '../types/Variable';

export function toDOM(schema: Schema): XMLDocument {
  let doc = xml.createDocument('data-model');
  let root = doc.documentElement;
  doc.insertBefore(doc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"'), root);

  const documentDiff = new OrderedIncrementalUpdater(schema.sourceElement, ['model']);

  for (let type in schema.objects) {
    let model = schema.objects[type];

    const updateModel = (modelElement: XMLElement) => {
      setAttributes(modelElement, {
        name: model.name,
        label: model.label
      });

      const diff = new OrderedIncrementalUpdater(model.sourceElement, ['field', 'belongs-to', 'has-many', 'display']);

      for (let attributeName in model.attributes) {
        const attribute = model.attributes[attributeName];
        diff.append(attribute.sourceElement, {
          tagName: 'field',
          update(fieldElement) {
            setAttributes(fieldElement, {
              name: attribute.name,
              label: attribute.label,
              type: attribute.sourceTypeName || attribute.type.stringify(),
              'auto-download': attribute.type.autoDownload ? 'true' : null
            });

            // single-choice, single-choice-integer and boolean fields all may contain <option> children.
            // For other elements, we just keep the children as is.
            const fieldDiff = new OrderedIncrementalUpdater(attribute.sourceElement, ['option']);
            updateOptions(fieldDiff, attribute);
            fieldDiff.update(fieldElement);
          },
          cloneDeep: false
        });
      }

      for (let fieldName in model.belongsTo) {
        const field = model.belongsToVars[fieldName];
        const rel = model.belongsTo[fieldName];
        diff.append(field.sourceElement, {
          tagName: 'belongs-to',
          update(fieldElement) {
            setAttributes(
              fieldElement,
              {
                model: rel.foreignType.name,
                name: rel.name
              },
              { name: rel.foreignType.name }
            );
          },
          cloneDeep: true
        });
      }

      for (let fieldName in model.hasMany) {
        const rel = model.hasMany[fieldName];
        const field = model.hasManyVars[fieldName];
        diff.append(field.sourceElement, {
          tagName: 'has-many',
          update(fieldElement) {
            setAttributes(fieldElement, {
              model: rel.objectType.name,
              name: rel.foreignName
            });
          },
          cloneDeep: true
        });
      }

      diff.append(model.displaySource, {
        tagName: 'display',
        update(displayElement) {
          displayElement.textContent = model.displayFormat.expression;
        },
        cloneDeep: true
      });

      diff.update(modelElement);
    };

    documentDiff.append(model.sourceElement, {
      tagName: 'model',
      update: updateModel,
      cloneDeep: false
    });
  }

  documentDiff.update(root);
  return doc;
}

/**
 * Update the options for single-choice, single-choice-integer and boolean fields.
 *
 * No-op for other fields.
 */
export function updateOptions(fieldDiff: OrderedIncrementalUpdater, attribute: Variable) {
  const options = attribute.type.options;
  if (options == null) {
    return;
  }
  const keys = Object.keys(options);

  // Special case for default boolean options, which doesn't have to be specified explicitly.
  //   <option key="false">No</option>
  //   <option key="true">Yes</option>
  let explicitOptions = true;
  if (
    attribute.type.name == 'boolean' &&
    keys.length == 2 &&
    keys[0] == 'false' &&
    keys[1] == 'true' &&
    options['false'].label == 'No' &&
    options['true'].label == 'Yes'
  ) {
    // Options match the default options. Use implicit ones.
    if (attribute.sourceElement && attribute.sourceElement.childNodes.length > 0) {
      // Source contained elements inside the tags. Could have been comments on the options.
      // Keep explicit options in this case.
      explicitOptions = true;
    } else {
      explicitOptions = false;
    }
  }

  if (!explicitOptions) {
    // No options needed.
    return;
  }

  // For single-choice-integer, keep track of the last key.
  let lastKey = -1;
  for (let key of keys) {
    const option = options[key];
    // If the key is equal to the previous one + 1, we don't have to specify it.
    // However, if the source had an explicit key, we keep it.
    const defaultValue = '' + (lastKey + 1);
    if (typeof option.value == 'number') {
      lastKey = option.value;
    }
    fieldDiff.append(option.sourceElement, {
      tagName: 'option',
      update(element) {
        setAttributes(
          element,
          {
            key: '' + option.value
          },
          {
            key: defaultValue
          }
        );
        element.textContent = option.label;
      },
      cloneDeep: true
    });
  }
}
