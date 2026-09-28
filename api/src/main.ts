import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as express from 'express';

import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isOriginAllowed } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const server = app.getHttpAdapter().getInstance();
  server.disable('x-powered-by');
  server.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    next();
  });

  const jwtService = app.get(JwtService);
  const jsonAuthenticated = express.json({ limit: '50mb' });
  const jsonAnonymous = express.json({ limit: '256kb' });
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      try {
        jwtService.verify(header.slice(7));
        return jsonAuthenticated(req, res, next);
      } catch {
        // token inválido o vencido: se trata como anónimo
      }
    }
    return jsonAnonymous(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  });

  const port = Number(process.env.PORT) || 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
