import {
  differenceInDays,
  startOfDay,
  endOfDay,
  addYears,
  isLeapYear,
  setYear,
  isBefore,
  isAfter,
  addDays,
  endOfWeek,
  endOfMonth,
} from 'date-fns';
import { Birthday } from '../services/api';

export interface BirthdayWithNextDate extends Birthday {
  nextOccurrence: Date;
  daysUntil: number;
}

/**
 * Calculate the next occurrence of a birthday from today
 * Handles edge cases like leap years (Feb 29) and year rollovers
 */
export function calculateNextOccurrence(
  birthDay: number,
  birthMonth: number,
  birthYear?: number | null
): Date {
  const today = startOfDay(new Date());
  const currentYear = today.getFullYear();

  // Try this year first
  let nextDate = new Date(currentYear, birthMonth - 1, birthDay);

  // Handle Feb 29 on non-leap years - celebrate on Feb 28
  if (birthMonth === 2 && birthDay === 29 && !isLeapYear(nextDate)) {
    nextDate = new Date(currentYear, 1, 28); // Feb 28
  }

  // If the birthday already passed this year, try next year
  if (isBefore(nextDate, today)) {
    nextDate = new Date(currentYear + 1, birthMonth - 1, birthDay);

    // Handle Feb 29 for next year too
    if (birthMonth === 2 && birthDay === 29 && !isLeapYear(nextDate)) {
      nextDate = new Date(currentYear + 1, 1, 28);
    }
  }

  return startOfDay(nextDate);
}

/**
 * Calculate days until a date (0 means today)
 */
export function daysUntilDate(targetDate: Date): number {
  const today = startOfDay(new Date());
  return differenceInDays(startOfDay(targetDate), today);
}

/**
 * Enrich birthday data with next occurrence and days until
 */
export function enrichBirthdayWithNextDate(birthday: Birthday): BirthdayWithNextDate {
  const nextOccurrence = calculateNextOccurrence(
    birthday.birthDay,
    birthday.birthMonth,
    birthday.birthYear
  );
  const daysUntil = daysUntilDate(nextOccurrence);

  return {
    ...birthday,
    nextOccurrence,
    daysUntil,
  };
}

export type SectionType = 'Today' | 'This Week' | 'This Month' | 'Next Month';

export interface BirthdaySection {
  title: SectionType;
  data: BirthdayWithNextDate[];
}

/**
 * Determine which section a birthday belongs to based on days until
 */
export function getSectionForBirthday(daysUntil: number): SectionType {
  if (daysUntil === 0) {
    return 'Today';
  }

  const today = startOfDay(new Date());
  const targetDate = addDays(today, daysUntil);

  // This week means within 7 days (not including today)
  const endOfThisWeek = endOfWeek(today, { weekStartsOn: 0 }); // Sunday start
  if (daysUntil <= 7 && !isAfter(targetDate, endOfThisWeek)) {
    return 'This Week';
  }

  // This month means before end of current month (not including this week)
  const endOfThisMonth = endOfMonth(today);
  if (!isAfter(targetDate, endOfThisMonth)) {
    return 'This Month';
  }

  // Everything else goes to next month
  return 'Next Month';
}

/**
 * Group birthdays into sections and sort by next occurrence
 */
export function groupBirthdaysBySection(birthdays: Birthday[]): BirthdaySection[] {
  // Enrich all birthdays with next occurrence data
  const enrichedBirthdays = birthdays.map(enrichBirthdayWithNextDate);

  // Sort by next occurrence date (earliest first)
  enrichedBirthdays.sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());

  // Group into sections
  const sections: Record<SectionType, BirthdayWithNextDate[]> = {
    Today: [],
    'This Week': [],
    'This Month': [],
    'Next Month': [],
  };

  enrichedBirthdays.forEach((birthday) => {
    const section = getSectionForBirthday(birthday.daysUntil);
    sections[section].push(birthday);
  });

  // Convert to array format for SectionList, only including non-empty sections
  const sectionOrder: SectionType[] = ['Today', 'This Week', 'This Month', 'Next Month'];
  return sectionOrder
    .filter((title) => sections[title].length > 0)
    .map((title) => ({
      title,
      data: sections[title],
    }));
}

/**
 * Format "days until" text for display
 */
export function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) {
    return 'Today!';
  } else if (daysUntil === 1) {
    return 'Tomorrow';
  } else {
    return `${daysUntil} days away`;
  }
}
