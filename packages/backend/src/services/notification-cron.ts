import cron from 'node-cron';
import { db } from '../db';
import { birthdays, users } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendPushNotification } from './push-notifications';

export function startNotificationCron() {
  // Run every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running birthday notification check...');

    try {
      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Find birthdays happening today or within notification window
      const upcomingBirthdays = await db
        .select({
          birthday: birthdays,
          user: users,
        })
        .from(birthdays)
        .innerJoin(users, eq(birthdays.userId, users.id))
        .where(
          and(
            eq(birthdays.notificationEnabled, true),
            sql`to_char(${birthdays.birthDate}, 'MM-DD') = ${todayStr}`
          )
        );

      for (const { birthday, user } of upcomingBirthdays) {
        if (user.deviceToken) {
          await sendPushNotification(user.deviceToken, {
            title: 'Birthday Reminder',
            body: `Today is ${birthday.name}'s birthday!`,
            data: {
              birthdayId: birthday.id,
            },
          });
        }
      }

      console.log(`Sent ${upcomingBirthdays.length} birthday notifications`);
    } catch (error) {
      console.error('Error sending birthday notifications:', error);
    }
  });

  console.log('Birthday notification cron job started');
}
