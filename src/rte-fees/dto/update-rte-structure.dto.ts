import { PartialType } from '@nestjs/mapped-types';
import { CreateRteStructureDto } from './create-rte-structure.dto';

export class UpdateRteStructureDto extends PartialType(CreateRteStructureDto) {}
