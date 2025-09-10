// packages/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // ← ICI si tu veux filtrer les niveaux de logs Nest
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({
    origin: (origin, cb) => cb(null, true),
    credentials: false,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  });

  app.use(helmet());
  app.use(cookieParser());

  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
  console.log('API listening on', process.env.PORT || 3000);
}
bootstrap();
