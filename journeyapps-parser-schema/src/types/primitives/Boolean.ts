import { BooleanType as ValueBooleanType } from '@ja-platform/types';
import { withChoices } from './ChoiceType';

export class BooleanType extends withChoices(ValueBooleanType) {}
