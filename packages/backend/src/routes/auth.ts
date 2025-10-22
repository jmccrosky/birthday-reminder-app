import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (server) => {
  server.post('/register', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 day',
      },
    },
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (existing) {
      return reply.code(400).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        name: body.name,
      })
      .returning();

    const token = server.jwt.sign({ userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  });

  server.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);

    if (!validPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = server.jwt.sign({ userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  });
};
