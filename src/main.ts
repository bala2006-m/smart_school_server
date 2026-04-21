import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // const app = await NestFactory.create(AppModule,{
  //  logger: ['error', 'warn', 'debug', 'verbose']
  // });
 const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, x-platform, x-sync-source',
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidUnknownValues: true,
    transform: true,
    stopAtFirstError: true,
  }));

  await app.listen(3003);
}

bootstrap();

