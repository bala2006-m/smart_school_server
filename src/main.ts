import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ✅ ENABLE CORS (required for Flutter Web ↔ local server)
  // Use `origin: true` to reflect the request Origin in dev.
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, x-platform, x-sync-source',
    optionsSuccessStatus: 204,
  });
  await app.listen(3003);
}
bootstrap();

