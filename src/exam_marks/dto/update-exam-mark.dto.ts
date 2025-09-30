import { PartialType } from '@nestjs/mapped-types';
import { CreateExamMarkDto } from './create-exam-marks.dto';

export class UpdateExamMarkDto extends PartialType(CreateExamMarkDto) {}
