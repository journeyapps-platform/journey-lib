import { Type } from '@ja-platform/types';

export class AttachmentType extends Type {
  readonly _typeName = 'attachment';
  static readonly TYPE = 'attachment';

  static isInstanceOf(type: Type): type is AttachmentType {
    return type.name === AttachmentType.TYPE;
  }

  media?: string;
  autoDownload?: boolean;

  constructor() {
    super(AttachmentType.TYPE);
  }
}
