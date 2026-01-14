import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
 
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    // ✅ ENABLE CORS
  app.enableCors({
    origin: '*', // allow all origins (for development)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });
  await app.listen(3003);
}
bootstrap();

 