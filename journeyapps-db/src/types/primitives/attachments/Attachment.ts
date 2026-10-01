import { AttachmentType as SchemaAttachmentType } from '@ja-platform/parser-schema';
import { DBTypeMixin, ValueSerializeOptions } from '../../Type';
import * as uuid from 'uuid';
import { Attachment, toBackendData } from '../../Attachment';

type GConstructor<T extends SchemaAttachmentType = SchemaAttachmentType> = new (...args: any[]) => T;

export function DBAttachmentTypeMixin<TBase extends GConstructor>(Base: TBase) {
  return class extends DBTypeMixin(Base) {
    valueToJSON(value: Attachment, options?: ValueSerializeOptions): any {
      if (!value) {
        return null;
      } else if (options?.inlineAttachments) {
        return value[toBackendData]();
      } else {
        return value.id;
      }
    }

    valueFromJSON(value: any): any {
      if (value != null) {
        return new Attachment(value);
      }
    }

    cast(value: any): any {
      if (Attachment.isAttachment(value)) {
        return value;
      } else if (typeof value == 'string') {
        if (!uuid.validate(value)) {
          throw new Error(value + ' is not a valid id');
        } else {
          return new Attachment(value);
        }
      } else if (typeof value == 'object') {
        return new Attachment(value);
      } else {
        throw new Error(value + ' is not a valid id');
      }
    }
  };
}

export class AttachmentType extends DBAttachmentTypeMixin(SchemaAttachmentType) {}
