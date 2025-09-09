import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log','error','warn','debug'] });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const port = Number(process.env.API_PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`API up on ${port}`);
}
bootstrap();
