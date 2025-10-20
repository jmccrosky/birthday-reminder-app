import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { birthdayRoutes } from './routes/birthdays';
import { userRoutes } from './routes/users';
import { startNotificationCron } from './services/notification-cron';

const server = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
  },
});

async function start() {
  try {
    // Register plugins
    await server.register(cors, {
      origin: true, // Configure appropriately for production
    });

    await server.register(jwt, {
      secret: config.jwtSecret,
    });

    // Swagger documentation
    await server.register(swagger, {
      openapi: {
        info: {
          title: 'Birthday Reminder API',
          description: 'API for managing birthday reminders',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://localhost:${config.port}`,
          },
        ],
      },
    });

    await server.register(swaggerUI, {
      routePrefix: '/documentation',
    });

    // Register routes
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(birthdayRoutes, { prefix: '/api/birthdays' });
    await server.register(userRoutes, { prefix: '/api/users' });

    // Health check
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start notification cron job
    if (config.nodeEnv === 'production') {
      startNotificationCron();
    }

    await server.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`Server running at http://${config.host}:${config.port}`);
    console.log(`Documentation available at http://${config.host}:${config.port}/documentation`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
