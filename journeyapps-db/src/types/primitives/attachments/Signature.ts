import { SignatureType as SchemaSignatureType } from '@ja-platform/parser-schema';
import { DBAttachmentTypeMixin } from './Attachment';

export class SignatureType extends DBAttachmentTypeMixin(SchemaSignatureType) {}
