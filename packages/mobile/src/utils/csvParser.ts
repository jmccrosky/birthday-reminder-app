export interface ParsedBirthday {
  firstName: string;
  lastName: string;
  birthMonth: number;
  birthDay: number;
  birthYear: number | null;
  originalLine: number;
}

export interface ParseError {
  line: number;
  error: string;
  rawData: string;
}

export interface ParseResult {
  valid: ParsedBirthday[];
  errors: ParseError[];
}

/**
 * Parse a semicolon-delimited CSV file with birthday data
 * Format: First Name;Last Name;Birthday
 * Birthday can be YYYY-MM-DD or M-D or MM-DD
 */
export function parseCSV(csvContent: string): ParseResult {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const valid: ParsedBirthday[] = [];
  const errors: ParseError[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const parsed = parseLine(line, i + 1);
      valid.push(parsed);
    } catch (error) {
      errors.push({
        line: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
        rawData: line,
      });
    }
  }

  return { valid, errors };
}

function parseLine(line: string, lineNumber: number): ParsedBirthday {
  const parts = line.split(';');

  if (parts.length < 3) {
    throw new Error('Invalid format: expected at least 3 columns (First Name;Last Name;Birthday)');
  }

  const firstName = parts[0]?.trim();
  const lastName = parts[1]?.trim() || '';
  const birthdayStr = parts[2]?.trim();

  if (!firstName) {
    throw new Error('First name is required');
  }

  if (!birthdayStr) {
    throw new Error('Birthday is required');
  }

  const birthday = parseBirthday(birthdayStr);

  return {
    firstName,
    lastName,
    ...birthday,
    originalLine: lineNumber,
  };
}

function parseBirthday(birthdayStr: string): {
  birthMonth: number;
  birthDay: number;
  birthYear: number | null;
} {
  // Try to parse as full date (YYYY-MM-DD)
  if (birthdayStr.includes('-') && birthdayStr.split('-').length === 3) {
    const parts = birthdayStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      validateDate(month, day, year);
      return { birthMonth: month, birthDay: day, birthYear: year };
    }
  }

  // Try to parse as month-day only (M-D or MM-DD)
  if (birthdayStr.includes('-') && birthdayStr.split('-').length === 2) {
    const parts = birthdayStr.split('-');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);

    if (!isNaN(month) && !isNaN(day)) {
      validateDate(month, day);
      return { birthMonth: month, birthDay: day, birthYear: null };
    }
  }

  throw new Error(`Invalid birthday format: ${birthdayStr}. Expected YYYY-MM-DD or M-D`);
}

function validateDate(month: number, day: number, year?: number): void {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
  }

  // Days in each month (accounting for leap years if year provided)
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Check for leap year if year is provided
  if (year && month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear) {
      daysInMonth[1] = 29;
    }
  } else if (!year && month === 2) {
    // Without year, allow Feb 29 (assume could be leap year)
    daysInMonth[1] = 29;
  }

  const maxDay = daysInMonth[month - 1];
  if (day < 1 || day > maxDay) {
    throw new Error(`Invalid day: ${day}. Month ${month} has ${maxDay} days`);
  }
}

/**
 * Format a birthday for display
 */
export function formatBirthday(birthday: ParsedBirthday): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monthStr = monthNames[birthday.birthMonth - 1];
  const dayStr = birthday.birthDay;

  if (birthday.birthYear) {
    return `${monthStr} ${dayStr}, ${birthday.birthYear}`;
  }

  return `${monthStr} ${dayStr}`;
}
