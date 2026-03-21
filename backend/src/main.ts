import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';

function maskMongoUri(uri?: string) {
  if (!uri) return 'not configured';
  try {
    const u = new URL(uri);
    if (u.username || u.password) {
      u.username = '****';
      u.password = '****';
    }
    return u.toString();
  } catch {
    return uri.replace(/\/\/.*@/, '//****@');
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();
  // Ensure Nest uses the Socket.IO adapter (allows passing options centrally if needed)
  app.useWebSocketAdapter(new IoAdapter(app));
  const config = app.get(ConfigService);
  const portStr = config?.get<string>('PORT') ?? process.env.PORT;
  const port = portStr ? Number(portStr) : 3000;
  const host = config?.get<string>('HOST') ?? process.env.HOST ?? 'localhost';
  const env =
    config?.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
  const mongodbUri =
    config?.get<string>('MONGODB_URI') ?? process.env.MONGODB_URI;

  // --- Swagger / OpenAPI setup ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mesa Digital API')
    .setDescription('Documentación de la API de Mesa Digital')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  // ensure the spec contains a server entry pointing to the running API base
  (swaggerDocument as any).servers = [
    { url: `http://${host}:${port}/${globalPrefix}` },
  ];
  SwaggerModule.setup(`${globalPrefix}/docs`, app, swaggerDocument, {
    swaggerOptions: {
      filter: true,
      persistAuthorization: true,
    },
  });

  // Write OpenAPI JSON to backend root
  try {
    const backendSpecPath = join(process.cwd(), 'openapi.json');
    writeFileSync(backendSpecPath, JSON.stringify(swaggerDocument, null, 2));
    logger.log(`📄 OpenAPI spec written to ${backendSpecPath}`, 'Swagger');
  } catch (err) {
    logger.warn(
      `Could not write OpenAPI spec to backend path: ${err?.message}`,
      'Swagger',
    );
  }

  // Log DB URI (masked) and attach mongoose listeners
  if (mongodbUri) {
    logger.log(`🗄️  MongoDB URI: ${maskMongoUri(mongodbUri)}`, 'Bootstrap');
  } else {
    logger.warn('⚠️  MongoDB URI not configured', 'Bootstrap');
  }

  const stateNames = [
    'disconnected',
    'connected',
    'connecting',
    'disconnecting',
  ];
  const state = mongoose.connection.readyState;
  const stateName = stateNames[state] ?? `unknown(${state})`;
  logger.log(`🔗 MongoDB connection state: ${stateName}`, 'Bootstrap');

  mongoose.connection.on('connected', () =>
    logger.log('✅ MongoDB connected', 'Mongoose'),
  );
  mongoose.connection.on('error', (err: Error) =>
    logger.error(`❌ MongoDB error: ${err.message}`, err.stack, 'Mongoose'),
  );
  mongoose.connection.on('disconnected', () =>
    logger.warn('⚠️  MongoDB disconnected', 'Mongoose'),
  );

  await app.listen(port);

  logger.log(
    `🚀 Application running on http://${host}:${port}/api/v1`,
    'Bootstrap',
  );
  logger.log(`🌐 Environment: ${env}`, 'Bootstrap');
  logger.log(`🧾 PID: ${process.pid}`, 'Bootstrap');
  logger.log(
    `💻 Node: ${process.version} / Platform: ${process.platform}`,
    'Bootstrap',
  );
  logger.log(`⏱️  Uptime: ${process.uptime().toFixed(2)}s`, 'Bootstrap');
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Fatal error during bootstrap', err?.stack ?? String(err));
  process.exit(1);
});
