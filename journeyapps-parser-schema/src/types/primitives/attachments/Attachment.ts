import { TypeInterface } from '@ja-platform/evaluator';
import { Type } from '../../Type';

export class AttachmentType extends Type {
  static readonly TYPE = 'attachment';

  static isInstanceOf(type: TypeInterface): type is AttachmentType {
    return type.name === AttachmentType.TYPE;
  }

  media?: string;
  autoDownload?: boolean;

  constructor() {
    super(AttachmentType.TYPE);
  }
}
