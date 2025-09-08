import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: [/localhost/], credentials: true });
  app.use(cookieParser());
  await app.listen(process.env.API_PORT || 3000);
}
bootstrap();
