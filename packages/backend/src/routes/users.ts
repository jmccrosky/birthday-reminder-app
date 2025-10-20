import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateUser } from '../middleware/auth';

const updateDeviceTokenSchema = z.object({
  deviceToken: z.string(),
});

export const userRoutes: FastifyPluginAsync = async (server) => {
  server.addHook('onRequest', authenticateUser);

  server.get('/me', async (request) => {
    const userId = (request as any).userId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { error: 'User not found' };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  });

  server.post('/device-token', async (request, reply) => {
    const userId = (request as any).userId;
    const body = updateDeviceTokenSchema.parse(request.body);

    await db
      .update(users)
      .set({ deviceToken: body.deviceToken, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return reply.code(200).send({ success: true });
  });
};
