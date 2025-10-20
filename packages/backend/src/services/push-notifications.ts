import { PubSub } from '@google-cloud/pubsub';
import { config } from '../config';

const pubsub = new PubSub({
  projectId: config.gcp.projectId,
});

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function sendPushNotification(
  deviceToken: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const topic = pubsub.topic(config.gcp.pubsubTopic);

    const messageData = {
      deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
    };

    const messageId = await topic.publishMessage({
      data: Buffer.from(JSON.stringify(messageData)),
    });

    console.log(`Push notification queued with message ID: ${messageId}`);
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}
