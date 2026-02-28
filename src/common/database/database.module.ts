import { Module, Global } from '@nestjs/common';
import { DatabaseConfigService } from './database.config';

@Global()
@Module({
    providers: [DatabaseConfigService],
    exports: [DatabaseConfigService],
})
export class DatabaseConfigModule { }
