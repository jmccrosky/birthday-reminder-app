import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.code(401).send({ error: 'No token provided' });
    }

    const decoded = await request.server.jwt.verify(token);
    (request as any).userId = (decoded as any).userId;
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}
