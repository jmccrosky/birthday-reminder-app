import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { birthdays } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateUser } from '../middleware/auth';

const createBirthdaySchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  notificationEnabled: z.boolean().default(true),
  notificationDaysBefore: z.number().int().min(0).default(0),
});

const updateBirthdaySchema = createBirthdaySchema.partial();

export const birthdayRoutes: FastifyPluginAsync = async (server) => {
  server.addHook('onRequest', authenticateUser);

  server.get('/', async (request) => {
    const userId = (request as any).userId;

    const userBirthdays = await db.query.birthdays.findMany({
      where: eq(birthdays.userId, userId),
      orderBy: (birthdays, { asc }) => [asc(birthdays.birthDate)],
    });

    return { birthdays: userBirthdays };
  });

  server.post('/', async (request, reply) => {
    const userId = (request as any).userId;
    const body = createBirthdaySchema.parse(request.body);

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
