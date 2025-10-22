import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { birthdays } from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { authenticateUser } from '../middleware/auth';

const baseBirthdaySchema = z.object({
  name: z.string().min(1).max(255),
  birthMonth: z.number().int().min(1).max(12),
  birthDay: z.number().int().min(1).max(31),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional().nullable(),
  notes: z.string().max(2000).optional(),
  notificationEnabled: z.boolean().default(true),
  notificationDaysBefore: z.number().int().min(0).max(365).default(0),
});

const createBirthdaySchema = baseBirthdaySchema.refine((data) => {
  // Validate day is valid for the given month
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return data.birthDay <= daysInMonth[data.birthMonth - 1];
}, {
  message: 'Invalid day for the specified month',
  path: ['birthDay'],
});

const updateBirthdaySchema = baseBirthdaySchema.partial();

export const birthdayRoutes: FastifyPluginAsync = async (server) => {
  server.addHook('onRequest', authenticateUser);

  server.get('/', async (request) => {
    const userId = (request as any).userId;

    const userBirthdays = await db.query.birthdays.findMany({
      where: eq(birthdays.userId, userId),
      orderBy: (birthdays, { asc }) => [asc(birthdays.birthMonth), asc(birthdays.birthDay)],
    });

    return { birthdays: userBirthdays };
  });

  server.post('/', async (request, reply) => {
    const userId = (request as any).userId;
    const body = createBirthdaySchema.parse(request.body);

    // Check rate limit: 100 birthdays per user per day
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentBirthdays = await db
      .select({ count: sql<number>`count(*)` })
      .from(birthdays)
      .where(and(eq(birthdays.userId, userId), gte(birthdays.createdAt, oneDayAgo)));

    const count = Number(recentBirthdays[0]?.count || 0);
    if (count >= 100) {
      return reply.code(429).send({
        error: 'Rate limit exceeded. Maximum 100 birthdays per day.'
      });
    }

    const [birthday] = await db
      .insert(birthdays)
      .values({
        ...body,
        userId,
      })
      .returning();

    return reply.code(201).send({ birthday });
  });

  server.get('/:id', async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    const birthday = await db.query.birthdays.findFirst({
      where: and(eq(birthdays.id, id), eq(birthdays.userId, userId)),
    });

    if (!birthday) {
      return reply.code(404).send({ error: 'Birthday not found' });
    }

    return { birthday };
  });

  server.put('/:id', async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };
    const body = updateBirthdaySchema.parse(request.body);

    const existing = await db.query.birthdays.findFirst({
      where: and(eq(birthdays.id, id), eq(birthdays.userId, userId)),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Birthday not found' });
    }

    const [updated] = await db
      .update(birthdays)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(birthdays.id, id))
      .returning();

    return { birthday: updated };
  });

  server.delete('/:id', async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    const existing = await db.query.birthdays.findFirst({
      where: and(eq(birthdays.id, id), eq(birthdays.userId, userId)),
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Birthday not found' });
    }

    await db.delete(birthdays).where(eq(birthdays.id, id));

    return reply.code(204).send();
  });
};
