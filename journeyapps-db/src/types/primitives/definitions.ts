import { PrimitiveType, PrimitiveTypeFactory, PrimitiveTypeName } from '@ja-platform/parser-schema';
import { AttachmentType } from './attachments/Attachment';
import { BooleanType } from './Boolean';
import { DateType } from './Date';
import { DatetimeType } from './Datetime';
import { GeoTrackType } from './GeoTrack';
import { IntegerType } from './Integer';
import { LocationType } from './Location';
import { MultipleChoiceType } from './MultipleChoice';
import { NumberType } from './Number';
import { SingleChoiceIntegerType } from './SingleChoiceInteger';
import { MultipleChoiceIntegerType } from './MultipleChoiceInteger';
import { SingleChoiceType } from './SingleChoice';
import { TextType } from './Text';
import { SignatureType } from './attachments/Signature';
import { PhotoType } from './attachments/Photo';

export const DBPrimitiveTypeMap = {
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

export type DBPrimitiveTypeMap = typeof DBPrimitiveTypeMap;

export type DBPrimitiveTypeInstance = InstanceType<DBPrimitiveTypeMap[PrimitiveTypeName]>;

export class DBPrimitiveTypeFactory<T extends DBPrimitiveTypeInstance> extends PrimitiveTypeFactory<T> {
  generate(event): T {
    const instance = new DBPrimitiveTypeMap[this.name]();
    instance.setupVariables(event.schema);
    return instance as T;
  }
}
