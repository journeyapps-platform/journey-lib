import { AttachmentType } from './attachments/Attachment';
import { TextType } from './Text';
import { BooleanType } from './Boolean';
import { LocationType } from './Location';
import { GeoTrackType } from './GeoTrack';
import { SingleChoiceType } from './SingleChoice';
import { SingleChoiceIntegerType } from './SingleChoiceInteger';
import { MultipleChoiceType } from './MultipleChoice';
import { MultipleChoiceIntegerType } from './MultipleChoiceInteger';
import { IntegerType, NumberType } from '@ja-platform/types';
import { DateType } from './Date';
import { DatetimeType } from './Datetime';
import { PhotoType } from './attachments/Photo';
import { SignatureType } from './attachments/Signature';

export const PrimitiveType = {
  ATTACHMENT: AttachmentType.TYPE,
  BOOLEAN: BooleanType.TYPE,
  DATE: DateType.TYPE,
  DATETIME: DatetimeType.TYPE,
  GEO_TRACK: GeoTrackType.TYPE,
  INTEGER: IntegerType.TYPE,
  LOCATION: LocationType.TYPE,
  MULTIPLE_CHOICE_INTEGER: MultipleChoiceIntegerType.TYPE,
  MULTIPLE_CHOICE: MultipleChoiceType.TYPE,
  NUMBER: NumberType.TYPE,
  SINGLE_CHOICE_INTEGER: SingleChoiceIntegerType.TYPE,
  SINGLE_CHOICE: SingleChoiceType.TYPE,
  TEXT: TextType.TYPE,
  PHOTO: PhotoType.SUB_TYPE,
  SIGNATURE: SignatureType.SUB_TYPE
} as const;
export type PrimitiveType = typeof PrimitiveType;

// Collection of primitive types.
// Each type is a constructor creating a default instance of that type.
export const PrimitiveTypeMap = {
  [PrimitiveType.ATTACHMENT]: AttachmentType,
  [PrimitiveType.BOOLEAN]: BooleanType,
  [PrimitiveType.DATE]: DateType,
  [PrimitiveType.DATETIME]: DatetimeType,
  [PrimitiveType.GEO_TRACK]: GeoTrackType,
  [PrimitiveType.INTEGER]: IntegerType,
  [PrimitiveType.LOCATION]: LocationType,
  [PrimitiveType.MULTIPLE_CHOICE_INTEGER]: MultipleChoiceIntegerType,
  [PrimitiveType.MULTIPLE_CHOICE]: MultipleChoiceType,
  [PrimitiveType.NUMBER]: NumberType,
  [PrimitiveType.SINGLE_CHOICE_INTEGER]: SingleChoiceIntegerType,
  [PrimitiveType.SINGLE_CHOICE]: SingleChoiceType,
  [PrimitiveType.TEXT]: TextType,
  [PrimitiveType.SIGNATURE]: SignatureType,
  [PrimitiveType.PHOTO]: PhotoType
} as const;

export type PrimitiveTypeMap = typeof PrimitiveTypeMap;

// Collection of primitive type names
export type PrimitiveTypeName = keyof typeof PrimitiveTypeMap;

export type PrimitiveTypeInstance = InstanceType<PrimitiveTypeMap[PrimitiveTypeName]>;

export * from './Boolean';
export * from './Date';
export * from './Datetime';
export { IntegerType, NumberType } from '@ja-platform/types';
export * from './Text';
export * from './Location';
export * from './GeoTrack';

export * from './ChoiceType';
export * from './MultipleChoice';
export * from './MultipleChoiceInteger';
export * from './SingleChoice';
export * from './SingleChoiceInteger';

export * from './attachments/Attachment';
export * from './attachments/Photo';
export * from './attachments/Signature';
