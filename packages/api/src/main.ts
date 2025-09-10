import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // ✅ Autorise toutes les origines pour éviter tout blocage CORS (tu pourras resserrer ensuite)
  app.enableCors({
    origin: (origin, cb) => cb(null, true), // reflect origin
    credentials: false,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(helmet());
  app.use(cookieParser());

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on ${port}`);
}
bootstrap();
