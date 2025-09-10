import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // Sécurité HTTP de base (compatibles HLS/proxy)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // Cookies (JWT httpOnly optionnel)
  app.use(cookieParser());

  // CORS: autorise le front à appeler l’API avec credentials
  const allowed = (process.env.CORS_ORIGINS ||
    'http://85.31.239.110:5173,http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // ex: curl/health
      if (allowed.includes(origin)) return cb(null, true);
      try {
        const u = new URL(origin);
        if (allowed.includes(`${u.protocol}//${u.host}`)) return cb(null, true);
      } catch {}
      return cb(null, false);
    },
    credentials: true, // -> Access-Control-Allow-Credentials: true
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  });

  // Si derrière un reverse proxy (Portainer/Traefik/Nginx)
  const httpAdapter = app.getHttpAdapter();
  const instance: any = httpAdapter.getInstance?.();
  if (instance?.set) {
    try {
      instance.set('trust proxy', 1);
    } catch {}
  }

  // Validation globale des DTO (retourne 400 plutôt que 500)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
