import { PhotoType as SchemaPhotoType } from '@ja-platform/parser-schema';
import { DBAttachmentTypeMixin } from './Attachment';

export class PhotoType extends DBAttachmentTypeMixin(SchemaPhotoType) {}
