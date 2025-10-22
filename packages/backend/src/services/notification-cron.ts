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
      const todayMonth = today.getMonth() + 1; // 1-12
      const todayDay = today.getDate(); // 1-31

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
            eq(birthdays.birthMonth, todayMonth),
            eq(birthdays.birthDay, todayDay)
          )
        );

      for (const { birthday, user } of upcomingBirthdays) {
        if (user.deviceToken) {
          // Calculate age if birth year is known
          let message = `Today is ${birthday.name}'s birthday!`;
          if (birthday.birthYear) {
            const age = today.getFullYear() - birthday.birthYear;
            message = `Today is ${birthday.name}'s ${age}${getOrdinalSuffix(age)} birthday!`;
          }

          await sendPushNotification(user.deviceToken, {
            title: 'Birthday Reminder',
            body: message,
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

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
